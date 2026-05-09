FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy all workspace package files
COPY shared/package*.json ./shared/
COPY services/authz-engine/package*.json ./services/authz-engine/
COPY services/management-api/package*.json ./services/management-api/
COPY services/audit-service/package*.json ./services/audit-service/
COPY dashboard/package*.json ./dashboard/
COPY infrastructure/database/package*.json ./infrastructure/database/

# Install dependencies for the entire workspace
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/authz-engine ./services/authz-engine

# Build shared first
RUN npm run build --workspace=@rbac-platform/shared

# Build the service
RUN npm run build --workspace=@rbac-platform/authz-engine

# Second stage: production
FROM node:20-alpine
WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
# Copy shared (required for file: dependency)
COPY --from=builder /app/shared ./shared

# Copy service built files
WORKDIR /app/services/authz-engine
COPY --from=builder /app/services/authz-engine/dist ./dist
COPY --from=builder /app/services/authz-engine/package*.json ./

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Start the service from its directory
CMD ["node", "dist/server.js"]