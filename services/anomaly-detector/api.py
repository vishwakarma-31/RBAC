"""
Anomaly Detection API
FastAPI REST server for real-time anomaly scoring.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import numpy as np
import logging
import os

from anomaly_detector import AnomalyDetector, AnomalyDetectorFactory
from feature_extractor import FeatureExtractor, AuthorizationEvent, create_event_from_dict
from model_trainer import ModelTrainer, TrainingConfig, DatabaseLoader


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnomalyScoreRequest(BaseModel):
    """Request for anomaly scoring"""
    tenant_id: str
    principal_id: str
    action: str
    resource_type: str
    resource_id: str
    ip_address: Optional[str] = None
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat())
    context: Optional[Dict[str, Any]] = {}


class AnomalyScoreResponse(BaseModel):
    """Response for anomaly scoring"""
    anomaly_score: float
    risk_level: str
    factors: List[Dict[str, Any]]
    recommended_action: str
    model_version: str
    timestamp: str


class BatchScoreRequest(BaseModel):
    """Request for batch scoring"""
    requests: List[AnomalyScoreRequest]


class BatchScoreResponse(BaseModel):
    """Response for batch scoring"""
    results: List[AnomalyScoreResponse]


class TrainRequest(BaseModel):
    """Request for model training"""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_of_data: int = 30
    tenant_id: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    model_version: Optional[str]
    features_count: int


class AnomalyDetectorService:
    """Service class to hold model state"""

    def __init__(self):
        self.detector: Optional[AnomalyDetector] = None
        self.feature_extractor = FeatureExtractor()
        self.trainer: Optional[ModelTrainer] = None
        self.model_version: Optional[str] = None

    def initialize(self):
        """Initialize the detector from saved model"""
        model_path = os.environ.get("MODEL_PATH", "models/anomaly_detector.joblib")

        if os.path.exists(model_path):
            self.detector = AnomalyDetector(model_path=model_path)
            self.model_version = self.detector.model_version

            self.trainer = ModelTrainer()

            logger.info(f"Model loaded: {self.model_version}")
        else:
            logger.warning("No model found, running in training mode")


service = AnomalyDetectorService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    service.initialize()
    yield


app = FastAPI(
    title="RBAC Anomaly Detection API",
    description="Machine learning service for detecting anomalous access patterns",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_service() -> AnomalyDetectorService:
    """Dependency to get service instance"""
    return service


@app.get("/health", response_model=HealthResponse)
async def health_check(service: AnomalyDetectorService = Depends(get_service)):
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if service.detector else "degraded",
        model_loaded=service.detector is not None,
        model_version=service.model_version,
        features_count=len(service.feature_extractor.get_feature_names())
    )


@app.post("/api/v1/anomaly/score", response_model=AnomalyScoreResponse)
async def score_anomaly(
    request: AnomalyScoreRequest,
    service: AnomalyDetectorService = Depends(get_service)
):
    """
    Score a single authorization request for anomalies.

    This endpoint is called as a pre-authorization filter before
    the main authorization engine evaluates the request.
    """
    if service.detector is None:
        raise HTTPException(
            status_code=503,
            detail="Anomaly detection model not loaded. Train a model first."
        )

    try:
        timestamp = datetime.fromisoformat(request.timestamp)

        event = AuthorizationEvent(
            tenant_id=request.tenant_id,
            principal_id=request.principal_id,
            action=request.action,
            resource_type=request.resource_type,
            resource_id=request.resource_id,
            decision="pending",
            timestamp=timestamp,
            ip_address=request.ip_address,
            context=request.context or {}
        )

        feature_vector = service.feature_extractor.extract_features(event)

        feature_values = {}
        feature_names = service.feature_extractor.get_feature_names()
        for i, name in enumerate(feature_names):
            if i < len(feature_vector):
                feature_values[name] = float(feature_vector[i])

        result = service.detector.score_single(feature_vector, feature_values)

        service.feature_extractor.update_stats(event)

        return AnomalyScoreResponse(
            anomaly_score=result.anomaly_score,
            risk_level=result.risk_level,
            factors=result.contributing_factors,
            recommended_action=result.recommended_action,
            model_version=result.model_version,
            timestamp=result.timestamp.isoformat()
        )

    except Exception as e:
        logger.error(f"Error scoring anomaly: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/anomaly/score/batch", response_model=BatchScoreResponse)
async def score_batch_anomalies(
    request: BatchScoreRequest,
    service: AnomalyDetectorService = Depends(get_service)
):
    """Score multiple authorization requests for anomalies"""
    if service.detector is None:
        raise HTTPException(
            status_code=503,
            detail="Anomaly detection model not loaded"
        )

    results = []

    for req in request.requests:
        try:
            timestamp = datetime.fromisoformat(req.timestamp)

            event = AuthorizationEvent(
                tenant_id=req.tenant_id,
                principal_id=req.principal_id,
                action=req.action,
                resource_type=req.resource_type,
                resource_id=req.resource_id,
                decision="pending",
                timestamp=timestamp,
                ip_address=req.ip_address,
                context=req.context or {}
            )

            feature_vector = service.feature_extractor.extract_features(event)

            feature_values = {}
            feature_names = service.feature_extractor.get_feature_names()
            for i, name in enumerate(feature_names):
                if i < len(feature_vector):
                    feature_values[name] = float(feature_vector[i])

            result = service.detector.score_single(feature_vector, feature_values)

            service.feature_extractor.update_stats(event)

            results.append(AnomalyScoreResponse(
                anomaly_score=result.anomaly_score,
                risk_level=result.risk_level,
                factors=result.contributing_factors,
                recommended_action=result.recommended_action,
                model_version=result.model_version,
                timestamp=result.timestamp.isoformat()
            ))

        except Exception as e:
            logger.error(f"Error processing request: {e}")
            results.append(AnomalyScoreResponse(
                anomaly_score=1.0,
                risk_level="critical",
                factors=[],
                recommended_action="error",
                model_version="unknown",
                timestamp=datetime.utcnow().isoformat()
            ))

    return BatchScoreResponse(results=results)


@app.get("/api/v1/anomaly/profile/{tenant_id}/{principal_id}")
async def get_principal_profile(
    tenant_id: str,
    principal_id: str,
    service: AnomalyDetectorService = Depends(get_service)
):
    """Get behavioral profile for a principal"""
    stats = service.feature_extractor.principal_stats.get(principal_id)

    if not stats:
        return {
            "principal_id": principal_id,
            "total_requests": 0,
            "denied_requests": 0,
            "unique_resources": 0,
            "unique_actions": 0,
            "ip_addresses": [],
            "risk_level": "unknown"
        }

    total_requests = stats.get("total_requests", 0)
    denied_requests = stats.get("denied_requests", 0)

    return {
        "principal_id": principal_id,
        "total_requests": total_requests,
        "denied_requests": denied_requests,
        "denial_rate": denied_requests / max(total_requests, 1),
        "unique_resources": len(stats.get("unique_resources", set())),
        "unique_actions": len(stats.get("unique_actions", set())),
        "ip_addresses": list(stats.get("ip_addresses", set())),
        "last_request": stats.get("last_request_time").isoformat() if stats.get("last_request_time") else None
    }


@app.post("/api/v1/anomaly/train")
async def train_model(
    request: TrainRequest,
    background_tasks: BackgroundTasks,
    service: AnomalyDetectorService = Depends(get_service)
):
    """Trigger model training"""
    def train_task():
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=request.days_of_data)

        if request.start_date:
            start_date = datetime.fromisoformat(request.start_date)
        if request.end_date:
            end_date = datetime.fromisoformat(request.end_date)

        loader = DatabaseLoader()
        events = loader.load_events(start_date, end_date, request.tenant_id)

        config = TrainingConfig()
        trainer = ModelTrainer(config)

        result = trainer.train(events, validate=True)

        if result.success:
            service.detector = trainer.detector
            service.model_version = result.model_version
            service.trainer = trainer

    background_tasks.add_task(train_task)

    return {
        "status": "training_started",
        "message": "Model training started in background",
        "estimated_duration": f"{request.days_of_data * 2} seconds"
    }


@app.get("/api/v1/anomaly/events")
async def get_anomaly_events(
    tenant_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    service: AnomalyDetectorService = Depends(get_service)
):
    """Get detected anomaly events"""
    events = service.feature_extractor.principal_stats

    all_events = []

    for principal_id, stats in events.items():
        denied_ratio = stats.get("denied_requests", 0) / max(stats.get("total_requests", 1), 1)

        if denied_ratio > 0.3:
            all_events.append({
                "principal_id": principal_id,
                "total_requests": stats.get("total_requests", 0),
                "denied_requests": stats.get("denied_requests", 0),
                "denial_rate": denied_ratio,
                "last_request": stats.get("last_request_time").isoformat() if stats.get("last_request_time") else None,
                "risk_level": "high" if denied_ratio > 0.5 else "medium"
            })

    all_events.sort(key=lambda x: x["denial_rate"], reverse=True)

    return {
        "events": all_events[:limit],
        "total": len(all_events)
    }


@app.get("/metrics")
async def get_metrics(service: AnomalyDetectorService = Depends(get_service)):
    """Get Prometheus-compatible metrics"""
    stats = service.feature_extractor.principal_stats

    total_requests = sum(s.get("total_requests", 0) for s in stats.values())
    total_denied = sum(s.get("denied_requests", 0) for s in stats.values())

    return {
        "anomaly_detector_total_requests": total_requests,
        "anomaly_detector_total_denied": total_denied,
        "anomaly_detector_unique_principals": len(stats),
        "anomaly_detector_model_loaded": 1 if service.detector else 0
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))

    uvicorn.run(app, host="0.0.0.0", port=port)