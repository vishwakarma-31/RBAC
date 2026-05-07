"""
Feature Extractor Module
Extracts and engineers features from authorization requests for anomaly detection.
"""

import numpy as np
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import hashlib


@dataclass
class AuthorizationEvent:
    """Represents an authorization event for feature extraction"""
    tenant_id: str
    principal_id: str
    action: str
    resource_type: str
    resource_id: str
    decision: str
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PrincipalProfile:
    """Behavioral profile for a principal"""
    principal_id: str
    role: str
    access_history: deque = field(default_factory=lambda: deque(maxlen=10000))
    temporal_patterns: Dict[str, List[int]] = field(default_factory=dict)
    resource_patterns: Dict[str, int] = field(default_factory=dict)
    action_patterns: Dict[str, int] = field(default_factory=dict)


class FeatureExtractor:
    """
    Extracts features from authorization events for anomaly detection.
    """

    ROLLING_WINDOW_MINUTES = 60

    def __init__(self):
        self.profiles: Dict[str, PrincipalProfile] = {}
        self.principal_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "requests_per_minute": deque(maxlen=60),
            "requests_per_hour": deque(maxlen=60),
            "unique_resources": set(),
            "unique_actions": set(),
            "total_requests": 0,
            "denied_requests": 0,
            "last_request_time": None,
            "ip_addresses": set()
        })

    def extract_features(
        self,
        event: AuthorizationEvent,
        window_hours: int = 24
    ) -> np.ndarray:
        """
        Extract feature vector from an authorization event.

        Args:
            event: The authorization event
            window_hours: Time window for feature computation

        Returns:
            Feature vector as numpy array
        """
        stats = self.principal_stats[event.principal_id]

        temporal_features = self._extract_temporal_features(event)
        frequency_features = self._extract_frequency_features(event, stats)
        resource_features = self._extract_resource_features(event, stats)
        action_features = self._extract_action_features(event, stats)
        behavioral_features = self._extract_behavioral_features(event, stats)
        historical_features = self._extract_historical_features(event, stats)

        feature_vector = np.concatenate([
            temporal_features,
            frequency_features,
            resource_features,
            action_features,
            behavioral_features,
            historical_features
        ])

        return feature_vector

    def _extract_temporal_features(self, event: AuthorizationEvent) -> np.ndarray:
        """Extract time-based features with cyclical encoding"""
        hour = event.timestamp.hour
        day_of_week = event.timestamp.weekday()

        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        dow_sin = np.sin(2 * np.pi * day_of_week / 7)
        dow_cos = np.cos(2 * np.pi * day_of_week / 7)

        is_business_hour = 1.0 if 9 <= hour <= 17 and day_of_week < 5 else 0.0
        is_weekend = 1.0 if day_of_week >= 5 else 0.0
        is_night = 1.0 if hour >= 22 or hour <= 6 else 0.0

        return np.array([
            hour_sin,
            hour_cos,
            dow_sin,
            dow_cos,
            is_business_hour,
            is_weekend,
            is_night
        ])

    def _extract_frequency_features(
        self,
        event: AuthorizationEvent,
        stats: Dict[str, Any]
    ) -> np.ndarray:
        """Extract request frequency features"""
        current_time = event.timestamp
        requests_last_hour = 0

        for past_time in stats.get("request_times", []):
            if (current_time - past_time).total_seconds() / 3600 <= 1:
                requests_last_hour += 1

        unique_resources_count = len(stats.get("unique_resources", set()))
        unique_actions_count = len(stats.get("unique_actions", set()))

        requests_per_minute = requests_last_hour / 60.0
        resource_diversity = unique_resources_count / max(stats.get("total_requests", 1), 1)
        action_diversity = unique_actions_count / max(len(stats.get("action_patterns", {})), 1)

        return np.array([
            requests_last_hour,
            unique_resources_count,
            unique_actions_count,
            requests_per_minute,
            resource_diversity,
            action_diversity
        ])

    def _extract_resource_features(
        self,
        event: AuthorizationEvent,
        stats: Dict[str, Any]
    ) -> np.ndarray:
        """Extract resource access pattern features"""
        resources = stats.get("unique_resources", set())
        is_new_resource = 1.0 if event.resource_id not in resources else 0.0

        resource_type_counts = defaultdict(int)
        for res in resources:
            res_type = res.split(":")[0] if ":" in res else "unknown"
            resource_type_counts[res_type] += 1

        total_resources = len(resources)
        resource_type_entropy = 0.0

        if total_resources > 0:
            probs = np.array(list(resource_type_counts.values())) / total_resources
            resource_type_entropy = -np.sum(probs * np.log(probs + 1e-10))

        return np.array([
            is_new_resource,
            total_resources,
            resource_type_entropy,
            resource_type_counts.get(event.resource_type, 0)
        ])

    def _extract_action_features(
        self,
        event: AuthorizationEvent,
        stats: Dict[str, Any]
    ) -> np.ndarray:
        """Extract action pattern features"""
        actions = stats.get("action_patterns", {})

        write_actions = {"create", "update", "write", "delete", "admin"}
        is_write_action = 1.0 if event.action.lower() in write_actions else 0.0

        total_actions = sum(actions.values())
        write_ratio = actions.get("write", 0) / max(total_actions, 1)

        action_count = actions.get(event.action.lower(), 0)

        return np.array([
            is_write_action,
            write_ratio,
            action_count,
            total_actions
        ])

    def _extract_behavioral_features(
        self,
        event: AuthorizationEvent,
        stats: Dict[str, Any]
    ) -> np.ndarray:
        """Extract behavioral deviation features"""
        last_time = stats.get("last_request_time")

        time_gap_minutes = 0.0
        if last_time:
            time_gap_minutes = (event.timestamp - last_time).total_seconds() / 60

        avg_time_gap = stats.get("avg_time_gap", 30.0)
        time_deviation = abs(time_gap_minutes - avg_time_gap) / max(avg_time_gap, 1)

        request_count = stats.get("total_requests", 0)

        denied_ratio = stats.get("denied_requests", 0) / max(request_count, 1)

        ip_count = len(stats.get("ip_addresses", set()))
        is_new_ip = 1.0 if event.ip_address not in stats.get("ip_addresses", set()) else 0.0

        return np.array([
            time_gap_minutes,
            time_deviation,
            denied_ratio,
            ip_count,
            is_new_ip,
            request_count
        ])

    def _extract_historical_features(
        self,
        event: AuthorizationEvent,
        stats: Dict[str, Any]
    ) -> np.ndarray:
        """Extract historical comparison features"""
        current_hour = event.timestamp.hour
        current_day = event.timestamp.weekday()

        historical_hours = stats.get("historical_hours", [])
        hour_deviation = 0.0

        if historical_hours:
            avg_hour = np.mean(historical_hours)
            hour_deviation = abs(current_hour - avg_hour) / 12.0

        historical_days = stats.get("historical_days", [])
        day_deviation = 0.0

        if historical_days:
            avg_day = np.mean(historical_days)
            day_deviation = abs(current_day - avg_day) / 3.0

        return np.array([
            hour_deviation,
            day_deviation,
            len(historical_hours) / 1000.0,
            len(historical_days) / 30.0
        ])

    def update_stats(self, event: AuthorizationEvent) -> None:
        """Update principal statistics after processing an event"""
        stats = self.principal_stats[event.principal_id]

        stats["total_requests"] += 1

        if event.decision == "denied":
            stats["denied_requests"] += 1

        if "request_times" not in stats:
            stats["request_times"] = deque(maxlen=1000)
        stats["request_times"].append(event.timestamp)

        stats["unique_resources"].add(f"{event.resource_type}:{event.resource_id}")
        stats["unique_actions"].add(event.action.lower())

        if "action_patterns" not in stats:
            stats["action_patterns"] = defaultdict(int)
        stats["action_patterns"][event.action.lower()] += 1

        if event.ip_address:
            stats["ip_addresses"].add(event.ip_address)

        if "historical_hours" not in stats:
            stats["historical_hours"] = deque(maxlen=1000)
        stats["historical_hours"].append(event.timestamp.hour)

        if "historical_days" not in stats:
            stats["historical_days"] = deque(maxlen=100)
        stats["historical_days"].append(event.timestamp.weekday())

        if stats["last_request_time"]:
            time_gap = (event.timestamp - stats["last_request_time"]).total_seconds() / 60
            current_avg = stats.get("avg_time_gap", 30.0)
            stats["avg_time_gap"] = (current_avg * (stats["total_requests"] - 1) + time_gap) / stats["total_requests"]

        stats["last_request_time"] = event.timestamp

    def get_feature_names(self) -> List[str]:
        """Return ordered list of feature names"""
        return [
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


class BatchFeatureExtractor:
    """Extract features from batch of events for training"""

    def __init__(self):
        self.extractor = FeatureExtractor()

    def extract_batch(
        self,
        events: List[AuthorizationEvent]
    ) -> tuple[np.ndarray, List[str]]:
        """
        Extract features from a batch of events.

        Args:
            events: List of authorization events

        Returns:
            Tuple of (feature_matrix, event_ids)
        """
        if not events:
            return np.array([]), []

        feature_matrix = []
        event_ids = []

        for event in events:
            features = self.extractor.extract_features(event)

            feature_matrix.append(features)

            event_id = hashlib.md5(
                f"{event.tenant_id}:{event.principal_id}:{event.resource_id}:{event.timestamp}".encode()
            ).hexdigest()
            event_ids.append(event_id)

            self.extractor.update_stats(event)

        return np.array(feature_matrix), event_ids


def create_event_from_dict(data: Dict[str, Any]) -> AuthorizationEvent:
    """Create AuthorizationEvent from API request dict"""
    return AuthorizationEvent(
        tenant_id=data["tenant_id"],
        principal_id=data["principal_id"],
        action=data.get("action", "unknown"),
        resource_type=data.get("resource_type", "unknown"),
        resource_id=data.get("resource_id", "unknown"),
        decision=data.get("decision", "allowed"),
        timestamp=datetime.fromisoformat(data.get("timestamp", datetime.utcnow().isoformat())),
        ip_address=data.get("ip_address"),
        user_agent=data.get("user_agent"),
        context=data.get("context", {})
    )


if __name__ == "__main__":
    extractor = FeatureExtractor()

    now = datetime.utcnow()

    for i in range(100):
        event = AuthorizationEvent(
            tenant_id="tenant-001",
            principal_id="user-001",
            action="read",
            resource_type="document",
            resource_id=f"doc-{i % 10}",
            decision="allowed",
            timestamp=now - timedelta(minutes=i * 5),
            ip_address="192.168.1.100"
        )
        extractor.update_stats(event)

    test_event = AuthorizationEvent(
        tenant_id="tenant-001",
        principal_id="user-001",
        action="delete",
        resource_type="document",
        resource_id="doc-new",
        decision="allowed",
        timestamp=now,
        ip_address="192.168.1.100"
    )

    features = extractor.extract_features(test_event)

    print(f"Feature vector shape: {features.shape}")
    print(f"Feature names: {extractor.get_feature_names()}")