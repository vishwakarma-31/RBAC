"""
Configuration for Anomaly Detection Service
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings"""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Model
    model_path: str = "models/anomaly_detector.joblib"
    metadata_path: str = "models/metadata.json"

    # Database
    database_url: Optional[str] = Field(default=None, alias="DATABASE_URL")

    # Redis (optional for caching)
    redis_url: Optional[str] = Field(default=None, alias="REDIS_URL")

    # Authorization Engine Integration
    authz_engine_url: str = "http://localhost:3003/api/v1"

    # ML Configuration
    contamination: float = 0.05
    n_estimators: int = 200

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()


class ModelConfig:
    """Model-specific configuration"""

    FEATURE_NAMES = [
        "hour_sin", "hour_cos", "dow_sin", "dow_cos",
        "is_business_hour", "is_weekend", "is_night",
        "requests_last_hour", "unique_resources", "unique_actions",
        "requests_per_minute", "resource_diversity", "action_diversity",
        "is_new_resource", "total_resources", "resource_type_entropy",
        "resource_type_count",
        "is_write_action", "write_ratio", "action_count", "total_actions",
        "time_gap_minutes", "time_deviation", "denied_ratio",
        "ip_count", "is_new_ip", "request_count",
        "hour_deviation", "day_deviation", "historical_hour_weight",
        "historical_day_weight"
    ]

    RISK_THRESHOLDS = {
        "low": 0.3,
        "medium": 0.6,
        "high": 0.8,
        "critical": 1.0
    }


class DatabaseConfig:
    """Database configuration for loading training data"""

    DEFAULT_QUERY = """
        SELECT
            id, tenant_id, principal_id, action,
            resource_type, resource_id, decision,
            timestamp, ip_address, user_agent
        FROM authorization_audit_log
        WHERE timestamp BETWEEN :start_date AND :end_date
        ORDER BY timestamp DESC
        LIMIT :limit
    """

    BATCH_SIZE = 10000
    MAX_TRAINING_EVENTS = 1000000


class CacheConfig:
    """Cache configuration for feature extraction"""

    REDIS_KEY_PREFIX = "anomaly:"
    CACHE_TTL_SECONDS = 3600
    MAX_PROFILE_SIZE = 10000


def get_model_path() -> str:
    """Get the model path from settings or environment"""
    return os.environ.get("MODEL_PATH", settings.model_path)


def get_database_url() -> Optional[str]:
    """Get database URL from settings or environment"""
    return os.environ.get("DATABASE_URL", settings.database_url)