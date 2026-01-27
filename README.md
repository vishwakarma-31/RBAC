# Enterprise Authorization Platform (AaaS)

An enterprise-grade Authorization as a Service platform implementing NIST RBAC Levels 1-3, ABAC, and Policy-Based Access Control with multi-tenancy, audit trails, and sub-millisecond decision latency.

## Architecture Overview

```
├── services/
│   ├── authz-engine/          # Core authorization decision engine
│   ├── management-api/        # Tenant/role/policy management
│   └── audit-service/         # Compliance logging and export
├── shared/
│   ├── types/                 # Shared TypeScript interfaces
│   ├── utils/                 # Common utilities
│   └── constants/             # System constants
├── infrastructure/
│   ├── database/              # Schema, migrations, RLS policies
│   ├── redis/                 # Cache configuration
│   └── kubernetes/            # Deployment manifests
├── sdk/
│   └── node/                  # Node.js client SDK
├── dashboard/                 # Admin React dashboard
└── docs/                      # Documentation and specs
```

## Key Features

- **NIST RBAC Levels 1-3**: Flat, Hierarchical, and Constrained RBAC
- **ABAC Support**: Attribute-based access control with resource/principal attributes
- **Policy Engine**: JSON-based deterministic policy evaluation
- **Multi-Tenancy**: Strict tenant isolation with row-level security
- **Performance**: Sub-5ms authorization decisions with Redis caching
- **Audit & Compliance**: Tamper-resistant logs with hash chaining
- **Explainability**: Detailed authorization decision explanations
- **Middleware Integration**: Express.js middleware for easy integration
- **Permission-Based Access**: No hardcoded role checks, runtime permission evaluation

## Security Principles

- **Zero Hardcoded Roles**: All permissions checked at runtime
- **Defense-in-Depth**: Multi-layer tenant isolation
- **Immutable Audit Trails**: Cryptographically secure logging
- **Immediate Policy Updates**: Cache invalidation on role/permission changes
- **Comprehensive Validation**: Strict input validation and sanitization
- **Privilege Escalation Prevention**: Role constraints and SoD policies

## Tech Stack

- **Backend**: Node.js + TypeScript
- **Database**: PostgreSQL with RLS
- **Cache**: Redis
- **API**: REST (OpenAPI 3.0)
- **Auth**: JWT (service-to-service)
- **Frontend**: React + TypeScript
- **Deployment**: Docker + Kubernetes

## Getting Started

### Quick Start with Docker
```bash
# Clone and setup
git clone <repository>
cd RBAC
make setup
make start

# Visit admin dashboard
open http://localhost:3003
```

### Manual Installation
See individual service READMEs for detailed setup instructions.

## RBAC Design Explanation

### Core Concepts

**Role-Based Access Control (RBAC)** follows the principle: **Role → Permission → User**

1. **Roles** are assigned to users (principals)
2. **Permissions** are granted to roles
3. **Users** inherit permissions through their assigned roles

This ensures:
- **Separation of Duties**: Users get only necessary permissions
- **Least Privilege**: No direct user-to-permission mapping
- **Auditability**: Clear traceability of access rights

### Permission Naming Convention

Permissions follow the format: `{resource}.{action}`

Examples:
- `invoice.read` - Read invoices
- `invoice.create` - Create invoices
- `user.delete` - Delete users
- `system.admin` - Administrative access

### Role Hierarchy

Roles can inherit permissions from parent roles:

```
System Admin (Level 0)
└── Tenant Admin (Level 1)
    └── Manager (Level 2)
        └── User (Level 3)
```

Users inherit permissions from all roles in their hierarchy path.

### Role Constraints

**Static Separation of Duty (SoD)**: Prevents assignment of mutually exclusive roles

Example: A user cannot be both `accountant` and `auditor` simultaneously.

### Middleware Integration

The platform provides Express.js middleware for easy integration:

```typescript
import { requirePermission, protectResource, adminOnly } from '@rbac-platform/authz-engine/middleware';

// Protect a route with specific permission
app.get('/invoices/:id', requirePermission('invoice.read'), (req, res) => {
  // Handler
});

// Protect all CRUD operations for a resource
app.use('/api/documents', protectResource('document', ['read', 'create', 'update', 'delete']));

// Admin-only route
app.get('/admin/users', adminOnly(), (req, res) => {
  // Handler
});
```

### Authorization Flow

1. **Request Interception**: Middleware extracts tenant, principal, and resource info
2. **RBAC Evaluation**: Check if user's roles grant required permission
3. **ABAC Evaluation**: Apply attribute-based conditions (ownership, department, etc.)
4. **Policy Evaluation**: Apply custom JSON policies (highest precedence)
5. **Decision**: Allow/Deny with detailed explanation
6. **Caching**: Cache decision for performance (invalidated on changes)

### Multi-Tenancy

Each tenant has isolated:
- Roles and permissions
- Users and assignments
- Policies
- Audit logs

Tenant ID is required for all authorization requests to ensure proper isolation.

## Current Status

✅ **Phase 1 Complete**: Architecture & Folder Structure
✅ **Phase 2 Complete**: Database Schema & Migrations
✅ **Phase 3 Complete**: Core Authorization Engine
✅ **Phase 4 Complete**: RBAC Hierarchy & Constraints
✅ **Phase 5 Complete**: Policy Engine
✅ **Phase 6 Complete**: Caching Layer
✅ **Phase 7 Complete**: Audit Logging
✅ **Phase 8 Complete**: REST API
✅ **Phase 9 Complete**: Admin Dashboard
✅ **Phase 10 Complete**: SDK

✅ **All Phases Complete**

## Development Commands

```bash
make help          # Show all available commands
make setup         # Install dependencies
make start         # Start all services
make db-reset      # Reset database
make test          # Run tests
make logs          # View service logs
```