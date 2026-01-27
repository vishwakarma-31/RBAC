module.exports = {
  migrationsTable: 'migrations',
  migrationDirectory: './migrations',
  driver: 'pg',
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres_password@localhost:5432/rbac_platform',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};