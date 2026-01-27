#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Create application users
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER authz_app_user WITH PASSWORD '${APP_USER_PASSWORD:-authz_app_password}';
    CREATE USER authz_system_user WITH PASSWORD '${SYSTEM_USER_PASSWORD:-authz_system_password}';
    
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO authz_app_user;
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO authz_system_user;
    
    \connect $POSTGRES_DB;
    
    GRANT USAGE ON SCHEMA public TO authz_app_user;
    GRANT USAGE ON SCHEMA public TO authz_system_user;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authz_app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authz_system_user;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authz_app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authz_system_user;
EOSQL

echo "Application users created successfully!"

# Run migrations
echo "Running database migrations..."
# Copy files to a writable directory
mkdir -p /tmp/migrations
cp /docker-entrypoint-initdb.d/package.json /tmp/migrations/
cp /docker-entrypoint-initdb.d/migration.config.js /tmp/migrations/
cp -r /docker-entrypoint-initdb.d/migrations /tmp/migrations/
cp -r /docker-entrypoint-initdb.d/scripts /tmp/migrations/
cd /tmp/migrations

# Install dependencies
npm install

# Run migrations with the correct database URL
export DATABASE_URL="postgresql://postgres:postgres_password@localhost:5432/rbac_platform"
npx node-pg-migrate up

echo "Database migrations completed!"

# Run seed script if SEED_DATABASE is set
if [[ "${SEED_DATABASE}" == "true" ]]; then
    echo "Seeding database with sample data..."
    node scripts/seed.js
    echo "Database seeding completed!"
else
    echo "Skipping database seeding. Set SEED_DATABASE=true to seed."
fi

echo "Database initialization complete!"