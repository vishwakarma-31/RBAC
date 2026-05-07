# Access Control Rules - JSON Payloads

This document provides exact JSON request and response payloads for evaluating access control rules in the RBAC authorization engine.

---

## 1. RBAC Authorization

### 1.1 Role-Based Access Request

Evaluates if the principal has a role that grants the required permission.

**Permission Format**: `{resource_type}.{action}`

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "read",
  "resource": {
    "type": "document",
    "id": "770e8400-e29b-41d4-a716-446655440002"
  }
}
```

#### Response - Allowed

```json
{
  "allowed": true,
  "reason": "Granted by role \"document-reader\" (Level 2)",
  "explanation": "Granted by role \"document-reader\" (Level 2)",
  "policy_evaluated": null,
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

#### Response - Denied

```json
{
  "allowed": false,
  "reason": "Missing required permission: document.read. Principal has roles: [viewer]",
  "explanation": "Missing required permission: document.read. Principal has roles: [viewer]",
  "policy_evaluated": null,
  "failed_conditions": [
    "Missing required permission: document.read"
  ],
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

### 1.2 Role Hierarchy Evaluation

When a user inherits permissions through role hierarchy.

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "admin",
  "resource": {
    "type": "system",
    "id": "770e8400-e29b-41d4-a716-446655440002"
  }
}
```

#### Response - Allowed via Inheritance

```json
{
  "allowed": true,
  "reason": "Granted by role \"super-admin\" (Level 0) - inherited through org-admin (Level 1)",
  "explanation": "Granted by role \"super-admin\" (Level 0) - inherited through org-admin (Level 1)",
  "policy_evaluated": null,
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

### 1.3 Multiple Roles Evaluation

When a principal has multiple roles, any role granting permission allows access.

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "delete",
  "resource": {
    "type": "invoice",
    "id": "INV-2026-001"
  }
}
```

#### Response

```json
{
  "allowed": true,
  "reason": "Granted by role \"finance-manager\" (Level 3)",
  "explanation": "Granted by role \"finance-manager\" (Level 3)",
  "policy_evaluated": null,
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

## 2. ABAC Authorization

### 2.1 Resource Ownership Check

Validates that the principal owns the resource.

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "update",
  "resource": {
    "type": "document",
    "id": "doc-001",
    "attributes": {
      "owner_id": "660e8400-e29b-41d4-a716-446655440001"
    }
  }
}
```

#### Response - Allowed

```json
{
  "allowed": true,
  "reason": "Resource ownership verified",
  "explanation": "Resource ownership verified",
  "policy_evaluated": null,
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

#### Response - Denied (Ownership Mismatch)

```json
{
  "allowed": false,
  "reason": "ABAC conditions failed: Resource owner mismatch: expected 660e8400-e29b-41d4-a716-446655440001, got 660e8400-e29b-41d4-a716-446655440099",
  "explanation": "ABAC conditions failed: Resource owner mismatch: expected 660e8400-e29b-41d4-a716-446655440001, got 660e8400-e29b-41d4-a716-446655440099",
  "policy_evaluated": null,
  "failed_conditions": [
    "Resource owner mismatch: expected 660e8400-e29b-41d4-a716-446655440001, got 660e8400-e29b-41d4-a716-446655440099"
  ],
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

### 2.2 Department Constraint

Validates principal's department matches resource's required department.

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "read",
  "resource": {
    "type": "report",
    "id": "report-finance-q1",
    "attributes": {
      "required_department": "finance"
    }
  },
  "principal": {
    "attributes": {
      "department": "finance"
    }
  }
}
```

#### Response - Allowed

```json
{
  "allowed": true,
  "reason": "Department constraint satisfied",
  "explanation": "All ABAC conditions satisfied",
  "policy_evaluated": null,
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

#### Response - Denied (Department Mismatch)

```json
{
  "allowed": false,
  "reason": "ABAC conditions failed: Department mismatch: required finance, got engineering",
  "explanation": "ABAC conditions failed: Department mismatch: required finance, got engineering",
  "policy_evaluated": null,
  "failed_conditions": [
    "Department mismatch: required finance, got engineering"
  ],
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

### 2.3 Clearance Level Check

Validates principal's clearance level meets resource's sensitivity requirement.

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "read",
  "resource": {
    "type": "document",
    "id": "doc-classified",
    "attributes": {
      "sensitivity": 4
    }
  },
  "principal": {
    "attributes": {
      "clearance_level": 3
    }
  }
}
```

#### Response - Denied (Insufficient Clearance)

```json
{
  "allowed": false,
  "reason": "ABAC conditions failed: Clearance level insufficient: 3 < 4",
  "explanation": "ABAC conditions failed: Clearance level insufficient: 3 < 4",
  "policy_evaluated": null,
  "failed_conditions": [
    "Clearance level insufficient: 3 < 4"
  ],
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

### 2.4 Combined ABAC Conditions

Multiple ABAC conditions in a single request.

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "delete",
  "resource": {
    "type": "record",
    "id": "rec-001",
    "attributes": {
      "owner_id": "660e8400-e29b-41d4-a716-446655440001",
      "required_department": "finance",
      "sensitivity": 2
    }
  },
  "principal": {
    "attributes": {
      "department": "finance",
      "clearance_level": 3
    }
  }
}
```

#### Response - Allowed

```json
{
  "allowed": true,
  "reason": "All ABAC conditions satisfied",
  "explanation": "All ABAC conditions satisfied",
  "policy_evaluated": null,
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

## 3. Policy-Based Authorization

### 3.1 JSON Policy Rule Structure

Policy rules are defined as JSON and stored in the database.

```json
{
  "id": "policy-time-restriction-001",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Business Hours Access",
  "version": "1.0.0",
  "description": "Restrict access to business hours only",
  "priority": 10,
  "status": "active",
  "rules": [
    {
      "id": "rule-1",
      "description": "Allow access during business hours",
      "condition": {
        "operator": "and",
        "conditions": [
          {
            "attribute": "context.hour",
            "operator": ">=",
            "value": 9
          },
          {
            "attribute": "context.hour",
            "operator": "<=",
            "value": 17
          },
          {
            "attribute": "context.day",
            "operator": "in",
            "values": ["monday", "tuesday", "wednesday", "thursday", "friday"]
          }
        ]
      },
      "effect": "allow",
      "priority": 1
    }
  ],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

---

### 3.2 Policy Evaluation Request

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "read",
  "resource": {
    "type": "document",
    "id": "doc-001"
  },
  "context": {
    "hour": 14,
    "day": "monday"
  }
}
```

#### Response - Policy Allow

```json
{
  "allowed": true,
  "reason": "Allow access during business hours",
  "explanation": "Allow access during business hours",
  "policy_evaluated": "rule-1",
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

#### Response - Policy Deny

```json
{
  "allowed": false,
  "reason": "Access denied: Outside business hours",
  "explanation": "Access denied: Outside business hours",
  "policy_evaluated": "policy-time-restriction-001",
  "failed_conditions": [
    "context.hour < 9",
    "context.day not in [monday, tuesday, wednesday, thursday, friday]"
  ],
  "evaluated_at": "2026-05-07T22:30:00.000Z",
  "cache_hit": false
}
```

---

### 3.3 Complex Policy with OR Conditions

```json
{
  "id": "policy-admin-exception-001",
  "rules": [
    {
      "id": "rule-admin",
      "condition": {
        "operator": "or",
        "conditions": [
          {
            "attribute": "principal.attributes.role",
            "operator": "=",
            "value": "admin"
          },
          {
            "attribute": "principal.attributes.clearance_level",
            "operator": ">=",
            "value": 5
          }
        ]
      },
      "effect": "allow",
      "priority": 1
    }
  ]
}
```

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "delete",
  "resource": {
    "type": "system",
    "id": "sys-config"
  },
  "principal": {
    "attributes": {
      "role": "admin",
      "clearance_level": 3
    }
  }
}
```

#### Response

```json
{
  "allowed": true,
  "reason": "Admin exception rule matched",
  "explanation": "Admin exception rule matched",
  "policy_evaluated": "rule-admin",
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

### 3.4 NOT Condition Example

Deny access from specific IP ranges.

```json
{
  "id": "policy-blocked-ips",
  "rules": [
    {
      "id": "rule-blocked",
      "condition": {
        "operator": "not",
        "conditions": [
          {
            "attribute": "principal.attributes.ip_address",
            "operator": "in",
            "values": ["10.0.0.0/8", "192.168.0.0/16"]
          }
        ]
      },
      "effect": "deny",
      "priority": 100
    }
  ]
}
```

#### Request

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "read",
  "resource": {
    "type": "document",
    "id": "doc-001"
  },
  "principal": {
    "attributes": {
      "ip_address": "203.0.113.50"
    }
  }
}
```

#### Response

```json
{
  "allowed": false,
  "reason": "IP address blocked by policy",
  "explanation": "IP address blocked by policy",
  "policy_evaluated": "rule-blocked",
  "failed_conditions": [
    "NOT condition was satisfied (expected false)"
  ],
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

---

## 4. Batch Authorization

### 4.1 Multiple Requests

```json
{
  "requests": [
    {
      "tenantId": "550e8400-e29b-41d4-a716-446655440000",
      "principalId": "660e8400-e29b-41d4-a716-446655440001",
      "action": "read",
      "resource": {
        "type": "document",
        "id": "doc-001"
      }
    },
    {
      "tenantId": "550e8400-e29b-41d4-a716-446655440000",
      "principalId": "660e8400-e29b-41d4-a716-446655440001",
      "action": "write",
      "resource": {
        "type": "document",
        "id": "doc-001"
      }
    },
    {
      "tenantId": "550e8400-e29b-41d4-a716-446655440000",
      "principalId": "660e8400-e29b-41d4-a716-446655440001",
      "action": "delete",
      "resource": {
        "type": "document",
        "id": "doc-001"
      }
    }
  ]
}
```

#### Response

```json
{
  "results": [
    {
      "allowed": true,
      "reason": "Granted by role \"document-editor\" (Level 2)",
      "explanation": "Granted by role \"document-editor\" (Level 2)",
      "evaluated_at": "2026-05-07T14:30:00.000Z",
      "cache_hit": false
    },
    {
      "allowed": true,
      "reason": "Granted by role \"document-editor\" (Level 2)",
      "explanation": "Granted by role \"document-editor\" (Level 2)",
      "evaluated_at": "2026-05-07T14:30:00.000Z",
      "cache_hit": false
    },
    {
      "allowed": false,
      "reason": "Missing required permission: document.delete",
      "explanation": "Missing required permission: document.delete. Principal has roles: [document-editor]",
      "failed_conditions": ["Missing required permission: document.delete"],
      "evaluated_at": "2026-05-07T14:30:00.000Z",
      "cache_hit": false
    }
  ]
}
```

---

## 5. Error Responses

### 5.1 Validation Error

```json
{
  "error": "Invalid request",
  "message": "tenantId must be a valid UUID"
}
```

### 5.2 Authentication Error

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 5.3 Rate Limit Error

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many authorization requests"
}
```

### 5.4 Server Error

```json
{
  "error": "Authorization evaluation failed",
  "message": "Database connection error"
}
```

---

## 6. Context Attributes

### 6.1 Time-Based Context

```json
"context": {
  "hour": 14,
  "minute": 30,
  "day": "monday",
  "date": "2026-05-07",
  "timezone": "America/New_York"
}
```

### 6.2 Location Context

```json
"context": {
  "ip_address": "192.168.1.100",
  "country": "US",
  "city": "New York",
  "is_vpn": false
}
```

### 6.3 Device Context

```json
"context": {
  "device_type": "desktop",
  "browser": "Chrome",
  "os": "Windows 11",
  "is_managed": true
}
```

---

## 7. Principal Attributes

```json
"principal": {
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "attributes": {
    "department": "engineering",
    "clearance_level": 3,
    "employment_type": "full-time",
    "manager_id": "770e8400-e29b-41d4-a716-446655440003",
    "ip_address": "192.168.1.100",
    "mfa_enabled": true,
    "last_login": "2026-05-07T10:00:00.000Z"
  }
}
```

---

## 8. Resource Attributes

```json
"resource": {
  "type": "document",
  "id": "doc-001",
  "attributes": {
    "owner_id": "660e8400-e29b-41d4-a716-446655440001",
    "department": "engineering",
    "sensitivity": 2,
    "classification": "internal",
    "created_at": "2026-01-15T00:00:00.000Z",
    "tags": ["project-alpha", "important"],
    "version": 3,
    "is_archived": false
  }
}
```