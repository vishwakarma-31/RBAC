"""
Model Trainer Module
Training pipeline for the anomaly detection models.
"""

import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import os
import json
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

from anomaly_detector import AnomalyDetector, AnomalyDetectorFactory
from feature_extractor import AuthorizationEvent, BatchFeatureExtractor, create_event_from_dict


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class TrainingConfig:
    """Configuration for model training"""
    model_type: str = "isolation_forest"
    n_estimators: int = 200
    contamination: float = 0.05
    test_size: float = 0.2
    min_samples: int = 100
    max_training_time_minutes: int = 30
    save_path: str = "models/anomaly_detector.joblib"
    metadata_path: str = "models/metadata.json"


@dataclass
class TrainingResult:
    """Result of model training"""
    success: bool
    model_path: str
    training_samples: int
    test_samples: int
    training_time_seconds: float
    features_used: List[str]
    model_version: str
    metrics: Dict[str, float]
    error_message: Optional[str] = None


class ModelTrainer:
    """
    Trains and maintains anomaly detection models.
    """

    def __init__(self, config: Optional[TrainingConfig] = None):
        self.config = config or TrainingConfig()
        self.detector: Optional[AnomalyDetector] = None
        self.feature_extractor = BatchFeatureExtractor()
        self.feature_names: List[str] = []

    def train(
        self,
        events: List[AuthorizationEvent],
        validate: bool = True
    ) -> TrainingResult:
        """
        Train the anomaly detection model.

        Args:
            events: List of authorization events for training
            validate: Whether to run validation

        Returns:
            TrainingResult with training metadata
        """
        start_time = datetime.now()

        if len(events) < self.config.min_samples:
            return TrainingResult(
                success=False,
                model_path="",
                training_samples=len(events),
                test_samples=0,
                training_time_seconds=0,
                features_used=[],
                model_version="",
                error_message=f"Insufficient training data: {len(events)} < {self.config.min_samples}"
            )

        logger.info(f"Starting training with {len(events)} events")

        X, event_ids = self.feature_extractor.extract_batch(events)

        self.feature_names = self.feature_extractor.extractor.get_feature_names()

        if validate:
            train_size = int(len(X) * (1 - self.config.test_size))
            X_train, X_test = X[:train_size], X[train_size:]
        else:
            X_train = X
            X_test = np.array([])

        detector = AnomalyDetectorFactory.create_default()

        detector.fit(X_train, self.feature_names)

        self.detector = detector

        metrics = {}
        if len(X_test) > 0:
            predictions, scores = detector.predict(X_test, return_scores=True)

            metrics = {
                "test_samples": len(X_test),
                "anomaly_rate": float(np.mean(predictions == -1)),
                "mean_anomaly_score": float(np.mean(scores)),
                "max_anomaly_score": float(np.max(scores)),
                "min_anomaly_score": float(np.min(scores))
            }

        training_time = (datetime.now() - start_time).total_seconds()

        model_version = f"1.0.{int(datetime.now().timestamp())}"

        os.makedirs(os.path.dirname(self.config.save_path), exist_ok=True)
        detector.save_model(self.config.save_path)

        metadata = {
            "version": model_version,
            "trained_at": datetime.now().isoformat(),
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "training_time_seconds": training_time,
            "features": self.feature_names,
            "algorithm": "IsolationForest + LOF ensemble",
            "hyperparameters": {
                "n_estimators": self.config.n_estimators,
                "contamination": self.config.contamination
            },
            "metrics": metrics
        }

        with open(self.config.metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Training completed in {training_time:.2f}s, version: {model_version}")

        return TrainingResult(
            success=True,
            model_path=self.config.save_path,
            training_samples=len(X_train),
            test_samples=len(X_test),
            training_time_seconds=training_time,
            features_used=self.feature_names,
            model_version=model_version,
            metrics=metrics
        )

    def train_incremental(
        self,
        new_events: List[AuthorizationEvent],
        batch_size: int = 1000
    ) -> bool:
        """
        Perform incremental training on new events.

        Args:
            new_events: New authorization events
            batch_size: Size of batches for retraining

        Returns:
            True if successful
        """
        if self.detector is None:
            logger.warning("No existing model, performing full training")
            return self.train(new_events).success

        logger.info(f"Starting incremental training with {len(new_events)} new events")

        X_new, _ = self.feature_extractor.extract_batch(new_events)

        self.detector.fit(X_new, self.feature_names)

        os.makedirs(os.path.dirname(self.config.save_path), exist_ok=True)
        self.detector.save_model(self.config.save_path)

        logger.info("Incremental training completed")

        return True

    def load_model(self, path: str) -> bool:
        """Load existing model from disk"""
        if not os.path.exists(path):
            logger.error(f"Model file not found: {path}")
            return False

        self.detector = AnomalyDetector(model_path=path)

        metadata_path = path.replace(".joblib", "_metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
                self.feature_names = metadata.get("features", [])

        logger.info(f"Model loaded from {path}")
        return True

    def evaluate(self, events: List[AuthorizationEvent]) -> Dict[str, Any]:
        """
        Evaluate model on a set of events.

        Args:
            events: Events to evaluate

        Returns:
            Dictionary with evaluation metrics
        """
        if self.detector is None:
            raise ValueError("No model loaded for evaluation")

        X, event_ids = self.feature_extractor.extract_batch(events)

        predictions, scores = self.detector.predict(X, return_scores=True)

        return {
            "total_events": len(events),
            "anomalies_detected": int(np.sum(predictions == -1)),
            "anomaly_rate": float(np.mean(predictions == -1)),
            "mean_score": float(np.mean(scores)),
            "median_score": float(np.median(scores)),
            "score_distribution": {
                "p25": float(np.percentile(scores, 25)),
                "p50": float(np.percentile(scores, 50)),
                "p75": float(np.percentile(scores, 75)),
                "p90": float(np.percentile(scores, 90)),
                "p95": float(np.percentile(scores, 95)),
                "p99": float(np.percentile(scores, 99))
            }
        }


class DatabaseLoader:
    """Load training data from MongoDB Atlas"""

    def __init__(self, connection_string: Optional[str] = None, database_name: str = "rbac_platform"):
        self.connection_string = connection_string or os.environ.get(
            "MONGODB_ATLAS_URI",
            "mongodb+srv://username:password@cluster.mongodb.net/test?retryWrites=true&w=majority"
        )
        self.database_name = database_name
        self.client: Optional[MongoClient] = None

    def connect(self) -> None:
        """Establish connection to MongoDB Atlas"""
        try:
            self.client = MongoClient(self.connection_string)
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB Atlas")
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB Atlas: {e}")
            raise

    def disconnect(self) -> None:
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB Atlas")

    def load_events(
        self,
        start_date: datetime,
        end_date: datetime,
        tenant_id: Optional[str] = None,
        limit: int = 100000
    ) -> List[AuthorizationEvent]:
        """
        Load authorization events from MongoDB Atlas.

        Args:
            start_date: Start of date range
            end_date: End of date range
            tenant_id: Optional tenant filter
            limit: Maximum events to load

        Returns:
            List of AuthorizationEvent objects
        """
        logger.info(f"Loading events from {start_date} to {end_date}")

        if not self.client:
            self.connect()

        db = self.client[self.database_name]
        collection = db['authorization_audit_log']

        query: Dict[str, Any] = {
            "timestamp": {
                "$gte": start_date,
                "$lte": end_date
            }
        }

        if tenant_id:
            query["tenant_id"] = tenant_id

        cursor = collection.find(query).sort("timestamp", -1).limit(limit)

        events = []
        for doc in cursor:
            event = AuthorizationEvent(
                tenant_id=doc.get("tenant_id", ""),
                principal_id=doc.get("principal_id", ""),
                action=doc.get("action", "unknown"),
                resource_type=doc.get("resource_type", "unknown"),
                resource_id=doc.get("resource_id", "unknown"),
                decision=doc.get("decision", "allowed"),
                timestamp=doc.get("timestamp", datetime.utcnow()),
                ip_address=doc.get("ip_address"),
                user_agent=doc.get("user_agent")
            )
            events.append(event)

        if not events:
            logger.warning("No events found in MongoDB, generating sample data")
            events = self._generate_sample_events(start_date, end_date, limit)

        return events

    def _generate_sample_events(
        self,
        start_date: datetime,
        end_date: datetime,
        count: int
    ) -> List[AuthorizationEvent]:
        """Generate sample events for demonstration"""
        events = []

        tenants = ["tenant-001", "tenant-002"]
        principals = [f"user-{i:03d}" for i in range(50)]
        actions = ["read", "write", "delete", "admin"]
        resource_types = ["document", "file", "folder", "system"]
        decisions = ["allowed", "denied"]

        np.random.seed(42)

        for i in range(count):
            event = AuthorizationEvent(
                tenant_id=np.random.choice(tenants),
                principal_id=np.random.choice(principals),
                action=np.random.choice(actions),
                resource_type=np.random.choice(resource_types),
                resource_id=f"res-{np.random.randint(1, 100):03d}",
                decision=np.random.choice(decisions, p=[0.85, 0.15]),
                timestamp=start_date + timedelta(
                    seconds=np.random.randint(0, int((end_date - start_date).total_seconds()))
                ),
                ip_address=f"192.168.{np.random.randint(1, 255)}.{np.random.randint(1, 255)}"
            )
            events.append(event)

        events.sort(key=lambda e: e.timestamp)

        return events


def train_model_from_database(
    connection_string: str,
    days_of_data: int = 30,
    output_path: str = "models/anomaly_detector.joblib"
) -> TrainingResult:
    """Convenience function to train model from MongoDB Atlas"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days_of_data)

    loader = DatabaseLoader(connection_string)
    events = loader.load_events(start_date, end_date)

    config = TrainingConfig(save_path=output_path)
    trainer = ModelTrainer(config)

    return trainer.train(events)


if __name__ == "__main__":
    loader = DatabaseLoader()

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)

    events = loader.load_events(start_date, end_date, limit=10000)

    print(f"Loaded {len(events)} events")

    config = TrainingConfig(
        n_estimators=100,
        contamination=0.1,
        min_samples=100
    )

    trainer = ModelTrainer(config)

    result = trainer.train(events, validate=True)

    print(f"Training result: {result.success}")
    print(f"Model version: {result.model_version}")
    print(f"Training time: {result.training_time_seconds:.2f}s")

    if result.success:
        metrics = trainer.evaluate(events[:1000])
        print(f"Evaluation metrics: {metrics}")