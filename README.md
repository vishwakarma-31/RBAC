# RBAC Authorization Platform

A multi-tenant authorization platform implementing RBAC, ABAC, and policy-based access control.

## Components

- Authorization Engine
- Management API
- Audit Service
- Admin Dashboard
- Node.js SDK

## Goals

- Centralized authorization logic
- Strong tenant isolation
- Explainable access decisions
- Auditable outcomes

## What This Is

- An authorization backend
- A configuration API
- A decision engine

## What This Is Not

- An identity provider
- An authentication service
- A full IAM replacement

## Getting Started

Run services using Docker or individually.
See service-level READMEs for setup instructions.

## Status

This repository represents an **in-progress platform implementation**.
Features and interfaces may evolve.

## Project Architecture

```
RBAC/
├── .git/
├── .gitignore
├── .qoder/
├── LICENSE
├── Makefile
├── README.md
├── dashboard/
│   ├── Dockerfile
│   ├── README.md
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   ├── sdk/
│   ├── src/
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── test-dashboard.js
├── docker-compose.yml
├── docs/
│   └── README.md
├── infrastructure/
│   ├── database/
│   │   ├── Dockerfile
│   │   ├── README.md
│   │   ├── docker-init.sh
│   │   ├── migration.config.js
│   │   ├── migrations/
│   │   │   ├── 001-initial-schema.js
│   │   │   ├── 002-row-level-security.js
│   │   │   └── 003-audit-log-partitioning.js
│   │   ├── package.json
│   │   └── scripts/
│   │       └── seed.js
│   ├── kubernetes/
│   │   └── README.md
│   └── redis/
│       └── README.md
├── sdk/
│   └── node/
│       ├── README.md
│       └── test-sdk.js
├── services/
│   ├── audit-service/
│   │   ├── Dockerfile
│   │   ├── README.md
│   │   ├── package.json
│   │   └── src/
│   │       └── server.ts
│   ├── authz-engine/
│   │   ├── .eslintrc.json
│   │   ├── Dockerfile
│   │   ├── README.md
│   │   ├── debug-constraint.js
│   │   ├── debug-policy.js
│   │   ├── jest.config.js
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── __tests__/
│   │   │   ├── authorization/
│   │   │   │   └── AuthorizationEngine.ts
│   │   │   ├── cache/
│   │   │   │   └── RedisCacheManager.ts
│   │   │   ├── config/
│   │   │   │   └── index.ts
│   │   │   ├── middleware/
│   │   │   │   ├── authorization.middleware.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── express.integration.ts
│   │   │   │   └── index.ts
│   │   │   ├── policy/
│   │   │   │   └── PolicyEngine.ts
│   │   │   ├── rbac/
│   │   │   │   └── RBACHierarchyManager.ts
│   │   │   ├── routes/
│   │   │   │   ├── authorization.ts
│   │   │   │   ├── health.ts
│   │   │   │   └── metrics.ts
│   │   │   ├── server.ts
│   │   │   └── utils/
│   │   │       └── logger.ts
│   │   ├── test-api.js
│   │   ├── test-audit.js
│   │   ├── test-authorization.js
│   │   ├── test-cache-integration.js
│   │   ├── test-cache.js
│   │   ├── test-policy.js
│   │   ├── test-rbac-simple.js
│   │   ├── test-rbac.js
│   │   ├── tsconfig.json
│   │   └── tsconfig.test.json
│   └── management-api/
│       ├── Dockerfile
│       ├── README.md
│       ├── package.json
│       └── src/
│           └── server.ts
└── shared/
    ├── constants/
    │   └── index.ts
    ├── index.ts
    ├── package.json
    ├── tsconfig.json
    ├── types/
    │   └── index.ts
    └── utils/
        └── index.ts
```