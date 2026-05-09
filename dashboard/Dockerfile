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
COPY dashboard ./dashboard

# Build shared first
RUN npm run build --workspace=@rbac-platform/shared

# Set build-time environment variables for React
ARG REACT_APP_API_BASE_URL=http://localhost:3001/api/v1
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Build the service
WORKDIR /app/dashboard
RUN CI=false npm run build

# Second stage: production
FROM nginx:alpine

# Copy custom nginx config
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dashboard/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]