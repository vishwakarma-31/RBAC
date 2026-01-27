# Audit Service

Compliance-focused service for immutable audit logging with tamper detection.

## Responsibilities

- Log every authorization decision
- Maintain tamper-resistant audit trails
- Support compliance reporting (SOC2, ISO 27001)
- Enable audit log querying and export
- Implement hash chaining for integrity
- Provide real-time audit streaming

## Architecture

```
├── src/
│   ├── logger/                 # Audit log writer
│   │   ├── database-writer.ts  # Primary storage
│   │   ├── hash-chain.ts       # Integrity protection
│   │   └── exporter.ts         # Compliance exports
│   ├── query/                  # Audit log querying
│   │   ├── searcher.ts         # Log search functionality
│   │   └── aggregator.ts       # Statistical analysis
│   ├── stream/                 # Real-time streaming
│   │   └── event-stream.ts     # WebSocket/Kafka integration
│   └── types/                  # Service-specific types
├── tests/                      # Unit and integration tests
└── Dockerfile                  # Container definition
```

## Security Model

### Immutable Logging
- Append-only database design
- No update/delete operations on audit records
- Cryptographic commitment to log entries
- Regular integrity verification

### Tamper Detection
- SHA-256 hashing of log entries
- Hash chaining with previous entries
- Merkle tree structures for batch verification
- Automated integrity monitoring

### Access Control
- Strict tenant isolation
- Read-only access for audit queries
- Administrative access logging
- Multi-factor authentication for auditors

## Data Model

### Audit Entry Structure
```typescript
interface AuditEntry {
  id: string;                    // UUID
  tenant_id: string;             // Tenant scope
  principal_id: string;          // Who performed the action
  action: string;                // What was done
  resource_type: string;         // Type of resource
  resource_id: string;           // Resource identifier
  decision: 'allowed' | 'denied'; // Authorization outcome
  reason: string;                // Explanation
  policy_evaluated?: string;     // Influencing policy
  request_hash: string;          // SHA-256 of request
  previous_hash: string;         // Hash chain link
  timestamp: Date;               // Precise timing
  metadata?: Record<string, any>; // Additional context
}
```

## Key Features

### Hash Chaining
Each audit entry includes the hash of the previous entry, creating an immutable chain:
```
Entry[n].previous_hash = SHA256(Entry[n-1].request_hash + Entry[n-1].previous_hash)
```

### Batch Verification
Merkle trees enable efficient verification of large audit log segments without checking each entry individually.

### Real-time Streaming
WebSocket/Kafka streams for:
- Security monitoring dashboards
- SIEM integration
- Real-time alerting
- Compliance dashboards

### Compliance Exports
Export formats:
- **JSON**: Machine-readable structured data
- **CSV**: Spreadsheet compatibility
- **PDF**: Human-readable reports
- **SIEM**: Industry-standard formats (CEF, LEEF)

## Performance Targets

- **Write Latency**: <10ms for audit entry creation
- **Query Latency**: <100ms for recent logs, <1s for historical
- **Storage Efficiency**: Compressed storage with partitioning
- **Retention**: Configurable (default: 7 years for compliance)

## Storage Strategy

### Primary Storage
- PostgreSQL with TimescaleDB extension for time-series optimization
- Partitioning by tenant and time period
- Indexing for common query patterns
- Compression for older entries

### Backup & Archival
- Daily encrypted backups
- Long-term archival to object storage (S3/GCS)
- Immutable storage buckets
- Regular restore testing

### Cold Storage
- Tiered storage for infrequently accessed logs
- Cost optimization for compliance retention
- Automated migration policies

## Query Capabilities

### Standard Queries
```sql
-- Authorization decisions by principal
SELECT * FROM audit_logs 
WHERE principal_id = 'uuid' 
AND timestamp > '2024-01-01'
ORDER BY timestamp DESC;

-- Failed access attempts
SELECT * FROM audit_logs 
WHERE decision = 'denied' 
AND timestamp > NOW() - INTERVAL '1 hour';

-- Policy effectiveness analysis
SELECT policy_evaluated, COUNT(*) as evaluations
FROM audit_logs 
WHERE policy_evaluated IS NOT NULL
GROUP BY policy_evaluated
ORDER BY evaluations DESC;
```

### Advanced Analytics
- Trend analysis of authorization patterns
- Anomaly detection for suspicious activity
- Role usage statistics
- Policy effectiveness metrics
- Compliance reporting dashboards

## Integration Points

### Inbound
- **Authz Engine**: Authorization decision logging
- **Management API**: Administrative action logging
- **External Systems**: Via webhook/SIEM integration

### Outbound
- **Monitoring Systems**: Prometheus/Grafana metrics
- **SIEM Solutions**: Real-time security event streaming
- **Compliance Tools**: Scheduled report generation
- **Analytics Platforms**: Data warehouse integration

## Compliance Features

### SOC2 Requirements
- Audit trail for all system access
- User identity tracking
- System configuration changes
- Security event logging

### ISO 27001 Requirements
- Information security events
- Access control violations
- System vulnerabilities
- Security incident responses

### GDPR Considerations
- Right to erasure compliance (pseudonymization)
- Data minimization principles
- Retention period management
- Breach notification support

## Monitoring & Alerting

### Health Checks
- Database connectivity
- Write performance
- Storage capacity
- Hash chain integrity

### Alerts
- Failed write operations
- Hash chain breaks
- Unusual access patterns
- Storage threshold warnings
- Compliance deadline approaching

## Disaster Recovery

### Recovery Point Objective (RPO)
- Maximum 1 minute data loss
- Continuous backup streaming
- Point-in-time recovery capability

### Recovery Time Objective (RTO)
- Maximum 15 minutes service restoration
- Automated failover procedures
- Hot standby deployment

## API Endpoints

```
POST /audit-entries              # Create audit entry (internal)
GET  /tenants/:tenantId/logs     # Query audit logs
POST /tenants/:tenantId/export   # Export compliance report
GET  /tenants/:tenantId/metrics  # Audit analytics
GET  /health                     # Service health
GET  /metrics                    # Prometheus metrics
```