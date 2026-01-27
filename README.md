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

## Security Principles

- Zero hardcoded roles or permissions
- Defense-in-depth tenant isolation
- Immutable audit trails
- Cryptographically secure logging
- Comprehensive input validation

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