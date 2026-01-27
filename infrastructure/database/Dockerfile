FROM postgres:15-alpine

# Install additional tools and Node.js
RUN apk add --no-cache \
    postgresql-contrib \
    curl \
    jq \
    nodejs \
    npm

# Copy migration files
COPY migrations /docker-entrypoint-initdb.d/migrations/
COPY scripts /docker-entrypoint-initdb.d/scripts/
COPY package.json /docker-entrypoint-initdb.d/package.json
COPY migration.config.js /docker-entrypoint-initdb.d/migration.config.js

# Copy initialization script
COPY docker-init.sh /docker-entrypoint-initdb.d/init.sh

# Set permissions
RUN chmod +x /docker-entrypoint-initdb.d/init.sh

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pg_isready -U postgres

# Use default PostgreSQL entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]