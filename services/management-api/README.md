# Management API

REST API for managing authorization data.

## Responsibilities

- Tenant management
- User (principal) management
- Role and permission configuration
- Policy lifecycle management
- Audit log access

## Design

- RESTful endpoints
- Tenant-scoped access
- JWT authentication

## Authorization

Administrative actions are authorized using the Authorization Engine.

## Notes

This service does not make authorization decisions for applications.
It manages configuration only.
