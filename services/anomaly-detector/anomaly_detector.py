"""
Anomaly Detector Module
Core ML component for detecting anomalous access patterns in the RBAC authorization engine.
Uses Isolation Forest as the primary algorithm with Local Outlier Factor as secondary.
"""

import numpy as np
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
import joblib
import os
import json
from datetime import datetime


@dataclass
class AnomalyResult:
    """Result of anomaly detection analysis"""
    anomaly_score: float
    risk_level: str
    contributing_factors: List[Dict[str, Any]]
    recommended_action: str
    model_version: str
    timestamp: datetime


class AnomalyDetector:
    """
    Anomaly detection for authorization requests.
    Uses ensemble of Isolation Forest and Local Outlier Factor.
    """

    IF_WEIGHT = 0.6
    LOF_WEIGHT = 0.4

    RISK_THRESHOLDS = {
        "low": 0.3,
        "medium": 0.6,
        "high": 0.8,
        "critical": 1.0
    }

    def __init__(
        self,
        if_params: Optional[Dict] = None,
        lof_params: Optional[Dict] = None,
        model_path: Optional[str] = None
    ):
        self.model_version = "1.0.0"
        self.feature_names: List[str] = []

        if_params = if_params or {
            "n_estimators": 200,
            "contamination": 0.05,
            "max_samples": "auto",
            "random_state": 42,
            "n_jobs": -1
        }

        lof_params = lof_params or {
            "n_neighbors": 20,
            "contamination": 0.05,
            "novelty": True,
            "n_jobs": -1
        }

        self.if_model = IsolationForest(**if_params)
        self.lof_model = LocalOutlierFactor(**lof_params)

        self.is_fitted = False
        self.feature_importance: Optional[np.ndarray] = None

        if model_path and os.path.exists(model_path):
            self.load_model(model_path)

    def fit(self, X: np.ndarray, feature_names: Optional[List[str]] = None) -> "AnomalyDetector":
        """
        Fit the anomaly detection models.

        Args:
            X: Training data matrix (n_samples, n_features)
            feature_names: Optional list of feature names

        Returns:
            self for chaining
        """
        self.feature_names = feature_names or [f"feature_{i}" for i in range(X.shape[1])]

        self.if_model.fit(X)

        self.lof_model.fit(X)

        self.is_fitted = True

        self._compute_feature_importance(X)

        return self

    def predict(
        self,
        X: np.ndarray,
        return_scores: bool = True
    ) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """
        Predict anomaly labels and scores.

        Args:
            X: Data matrix (n_samples, n_features)
            return_scores: Whether to return anomaly scores

        Returns:
            Tuple of (predictions, scores)
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before prediction")

        if_predictions = self.if_model.predict(X)

        if_scores = self._get_if_scores(X)

        lof_predictions = self.lof_model.predict(X)
        lof_scores = self._get_lof_scores(X)

        ensemble_scores = (
            self.IF_WEIGHT * if_scores +
            self.LOF_WEIGHT * lof_scores
        )

        predictions = (ensemble_scores > self.RISK_THRESHOLDS["low"]).astype(int)

        if return_scores:
            return predictions, ensemble_scores

        return predictions, None

    def score_single(
        self,
        features: np.ndarray,
        feature_contributions: Optional[Dict[str, float]] = None
    ) -> AnomalyResult:
        """
        Score a single request for anomalies.

        Args:
            features: Feature vector for the request
            feature_contributions: Optional dict of feature values for explanation

        Returns:
            AnomalyResult with score and risk assessment
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before scoring")

        X = features.reshape(1, -1)

        _, scores = self.predict(X, return_scores=True)

        anomaly_score = float(scores[0])

        risk_level = self._get_risk_level(anomaly_score)

        contributing_factors = self._get_contributing_factors(
            feature_contributions or {},
            features
        )

        recommended_action = self._get_recommended_action(risk_level)

        return AnomalyResult(
            anomaly_score=anomaly_score,
            risk_level=risk_level,
            contributing_factors=contributing_factors,
            recommended_action=recommended_action,
            model_version=self.model_version,
            timestamp=datetime.utcnow()
        )

    def _get_if_scores(self, X: np.ndarray) -> np.ndarray:
        """Get normalized Isolation Forest scores"""
        raw_scores = self.if_model.score_samples(X)

        min_val = raw_scores.min()
        max_val = raw_scores.max()

        if max_val - min_val == 0:
            return np.zeros_like(raw_scores)

        normalized = (raw_scores - min_val) / (max_val - min_val)

        return 1 - normalized

    def _get_lof_scores(self, X: np.ndarray) -> np.ndarray:
        """Get normalized LOF scores"""
        raw_scores = self.lof_model.score_samples(X)

        min_val = raw_scores.min()
        max_val = raw_scores.max()

        if max_val - min_val == 0:
            return np.zeros_like(raw_scores)

        normalized = (raw_scores - min_val) / (max_val - min_val)

        return 1 - normalized

    def _get_risk_level(self, score: float) -> str:
        """Determine risk level from anomaly score"""
        if score < self.RISK_THRESHOLDS["low"]:
            return "low"
        elif score < self.RISK_THRESHOLDS["medium"]:
            return "medium"
        elif score < self.RISK_THRESHOLDS["high"]:
            return "high"
        else:
            return "critical"

    def _get_contributing_factors(
        self,
        feature_values: Dict[str, float],
        features: np.ndarray
    ) -> List[Dict[str, Any]]:
        """Identify which features contributed most to the anomaly score"""
        factors = []

        if self.feature_importance is None:
            return factors

        importance_indices = np.argsort(self.feature_importance)[::-1]

        for idx in importance_indices[:3]:
            if idx < len(features):
                contribution = float(self.feature_importance[idx]) * features[idx]

                feature_name = self.feature_names[idx] if idx < len(self.feature_names) else f"feature_{idx}"

                factors.append({
                    "feature": feature_name,
                    "value": float(features[idx]),
                    "importance": float(self.feature_importance[idx]),
                    "contribution": round(contribution, 4)
                })

        return factors

    def _get_recommended_action(self, risk_level: str) -> str:
        """Get recommended action based on risk level"""
        actions = {
            "low": "allow",
            "medium": "allow_with_logging",
            "high": "flag_for_review",
            "critical": "require_verification"
        }
        return actions.get(risk_level, "allow")

    def _compute_feature_importance(self, X: np.ndarray) -> None:
        """Compute approximate feature importance using permutation"""
        baseline_score = self.if_model.score_samples(X).mean()

        importance = np.zeros(X.shape[1])

        for i in range(X.shape[1]):
            X_permuted = X.copy()
            X_permuted[:, i] = np.random.permutation(X_permuted[:, i])

            permuted_score = self.if_model.score_samples(X_permuted).mean()

            importance[i] = baseline_score - permuted_score

        self.feature_importance = np.abs(importance)
        self.feature_importance /= self.feature_importance.sum()

    def save_model(self, path: str) -> None:
        """Save model to disk"""
        os.makedirs(os.path.dirname(path), exist_ok=True)

        model_data = {
            "if_model": self.if_model,
            "lof_model": self.lof_model,
            "is_fitted": self.is_fitted,
            "feature_names": self.feature_names,
            "feature_importance": self.feature_importance,
            "model_version": self.model_version,
            "if_params": self.if_model.get_params(),
            "lof_params": self.lof_model.get_params()
        }

        joblib.dump(model_data, path)

    def load_model(self, path: str) -> None:
        """Load model from disk"""
        model_data = joblib.load(path)

        self.if_model = model_data["if_model"]
        self.lof_model = model_data["lof_model"]
        self.is_fitted = model_data["is_fitted"]
        self.feature_names = model_data["feature_names"]
        self.feature_importance = model_data["feature_importance"]
        self.model_version = model_data.get("model_version", "1.0.0")


class AnomalyDetectorFactory:
    """Factory for creating configured anomaly detectors"""

    @staticmethod
    def create_default() -> AnomalyDetector:
        """Create detector with default configuration"""
        return AnomalyDetector()

    @staticmethod
    def create_for_environment(env: str) -> AnomalyDetector:
        """Create detector for specific environment"""
        configs = {
            "production": {
                "if_params": {
                    "n_estimators": 300,
                    "contamination": 0.03,
                    "random_state": 42
                },
                "lof_params": {
                    "n_neighbors": 30,
                    "contamination": 0.03
                }
            },
            "development": {
                "if_params": {
                    "n_estimators": 100,
                    "contamination": 0.1,
                    "random_state": 42
                },
                "lof_params": {
                    "n_neighbors": 15,
                    "contamination": 0.1
                }
            },
            "testing": {
                "if_params": {
                    "n_estimators": 50,
                    "contamination": 0.15,
                    "random_state": 42
                },
                "lof_params": {
                    "n_neighbors": 10,
                    "contamination": 0.15
                }
            }
        }

        config = configs.get(env, configs["development"])

        return AnomalyDetector(**config)


if __name__ == "__main__":
    detector = AnomalyDetectorFactory.create_default()

    sample_data = np.random.randn(1000, 10)

    detector.fit(sample_data)

    detector.save_model("models/anomaly_detector.joblib")

    test_features = np.random.randn(1, 10)
    result = detector.score_single(test_features.flatten())

    print(f"Anomaly Score: {result.anomaly_score:.3f}")
    print(f"Risk Level: {result.risk_level}")
    print(f"Recommended Action: {result.recommended_action}")