# Admin Dashboard

React-based administration dashboard for managing tenants, roles, permissions, policies, and audit logs in the RBAC Authorization Platform.

## Purpose

This dashboard provides a UI for platform administrators to:
- Manage tenants and users
- Define roles and permissions
- Configure authorization policies
- Inspect audit logs
- Test authorization decisions

The dashboard communicates exclusively with the **Management API** and **Authorization Engine**.

## Tech Stack

- React 18 + TypeScript
- Redux Toolkit + RTK Query
- Material UI (MUI v5)
- React Router v6
- React Hook Form + Zod
- Monaco Editor (policy editing)
- Jest + React Testing Library

## Features

- Tenant management (create, suspend, view usage)
- Role and permission management
- Policy editor (JSON-based)
- Audit log viewer
- Authorization simulation (“can X do Y?”)

## Project Structure

src/
├── components/ # Reusable UI components
├── pages/ # Route-level pages
├── store/ # Redux store & RTK Query APIs
├── services/ # API clients
├── hooks/ # Custom hooks
└── utils/ # Shared helpers


## Authentication & Authorization

- Authentication is handled via JWT tokens issued by the backend
- UI routes are protected based on user permissions
- Authorization checks are enforced server-side; UI checks are defensive only

## Running Locally

```bash
npm install
npm start
Environment variables:

REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_AUTH_TOKEN_STORAGE_KEY=auth-token