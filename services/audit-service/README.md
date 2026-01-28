
---

# 7️⃣ `services/audit-service/README.md` (Corrected)

```md
# Audit Service

Service responsible for recording authorization decisions.

## Responsibilities

- Store authorization decisions
- Provide query access to audit logs
- Support export for compliance review

## Characteristics

- Append-only storage
- Tenant-scoped records
- Indexed for search

## Integrity

- Each entry includes a hash of request data
- Optional chaining can be enabled for tamper detection

## Integration

- Receives events from Authorization Engine
- Queried by Management API

## Notes

This service does not enforce authorization decisions.
It records outcomes for traceability.
