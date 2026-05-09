/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authz_app_user') THEN
        CREATE USER authz_app_user WITH PASSWORD 'authz_app_password';
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authz_system_user') THEN
        CREATE USER authz_system_user WITH PASSWORD 'authz_system_password';
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP USER IF EXISTS authz_app_user;
    DROP USER IF EXISTS authz_system_user;
  `);
};
