/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create partitioned audit_logs table for better performance and maintenance
  pgm.sql(`
    CREATE TABLE audit_logs_partitioned (
      LIKE audit_logs INCLUDING ALL
    ) PARTITION BY RANGE (timestamp);
  `);

  // Create monthly partitions for current year
  const currentYear = new Date().getFullYear();
  for (let month = 1; month <= 12; month++) {
    const startDate = `${currentYear}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(currentYear, month, 0).toISOString().split('T')[0]; // Last day of month
    
    pgm.sql(`
      CREATE TABLE audit_logs_${currentYear}_${String(month).padStart(2, '0')} 
      PARTITION OF audit_logs_partitioned
      FOR VALUES FROM ('${startDate}') TO ('${endDate}');
    `);
  }

  // Create indexes on partitioned table
  pgm.sql('CREATE INDEX idx_audit_logs_partitioned_tenant_timestamp ON audit_logs_partitioned(tenant_id, timestamp);');
  pgm.sql('CREATE INDEX idx_audit_logs_partitioned_principal ON audit_logs_partitioned(principal_id);');
  pgm.sql('CREATE INDEX idx_audit_logs_partitioned_decision ON audit_logs_partitioned(decision);');
  pgm.sql('CREATE INDEX idx_audit_logs_partitioned_resource ON audit_logs_partitioned(resource_type, resource_id);');
  pgm.sql('CREATE INDEX idx_audit_logs_partitioned_policy ON audit_logs_partitioned(policy_evaluated);');

  // Grant permissions to application users
  pgm.sql('GRANT SELECT, INSERT ON audit_logs_partitioned TO authz_app_user;');
  pgm.sql('GRANT SELECT, INSERT ON audit_logs_partitioned TO authz_system_user;');

  // Grant permissions on partitions
  for (let month = 1; month <= 12; month++) {
    const partitionName = `audit_logs_${currentYear}_${String(month).padStart(2, '0')}`;
    pgm.sql(`GRANT SELECT, INSERT ON ${partitionName} TO authz_app_user;`);
    pgm.sql(`GRANT SELECT, INSERT ON ${partitionName} TO authz_system_user;`);
  }

  // Create function to automatically create new partitions
  pgm.sql(`
    CREATE OR REPLACE FUNCTION create_audit_log_partition()
    RETURNS TRIGGER AS $$
    DECLARE
      partition_date DATE;
      partition_name TEXT;
      start_date DATE;
      end_date DATE;
    BEGIN
      partition_date := DATE_TRUNC('month', NEW.timestamp);
      partition_name := 'audit_logs_' || TO_CHAR(partition_date, 'YYYY_MM');
      start_date := partition_date;
      end_date := partition_date + INTERVAL '1 month';
      
      -- Check if partition exists
      IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = partition_name
      ) THEN
        -- Create new partition
        EXECUTE format('
          CREATE TABLE %I PARTITION OF audit_logs_partitioned
          FOR VALUES FROM (%L) TO (%L)',
          partition_name, start_date, end_date
        );
        
        -- Grant permissions
        EXECUTE format('GRANT SELECT, INSERT ON %I TO authz_app_user;', partition_name);
        EXECUTE format('GRANT SELECT, INSERT ON %I TO authz_system_user;', partition_name);
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger for automatic partitioning
  pgm.sql(`
    CREATE TRIGGER audit_log_partition_trigger
    BEFORE INSERT ON audit_logs_partitioned
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_partition();
  `);

  // Create view to maintain compatibility with existing code
  pgm.sql(`
    CREATE OR REPLACE VIEW audit_logs AS
    SELECT * FROM audit_logs_partitioned;
  `);

  // Grant permissions on view
  pgm.sql('GRANT SELECT, INSERT ON audit_logs TO authz_app_user;');
  pgm.sql('GRANT SELECT, INSERT ON audit_logs TO authz_system_user;');

  // Create maintenance function for dropping old partitions
  pgm.sql(`
    CREATE OR REPLACE FUNCTION drop_old_audit_partitions(retention_months INTEGER DEFAULT 84)
    RETURNS INTEGER AS $$
    DECLARE
      dropped_count INTEGER := 0;
      cutoff_date DATE;
      partition_record RECORD;
    BEGIN
      cutoff_date := DATE_TRUNC('month', NOW() - INTERVAL '1 month' * retention_months);
      
      FOR partition_record IN
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'audit_logs_%'
        AND tablename < 'audit_logs_' || TO_CHAR(cutoff_date, 'YYYY_MM')
      LOOP
        EXECUTE 'DROP TABLE ' || partition_record.tablename;
        dropped_count := dropped_count + 1;
      END LOOP;
      
      RETURN dropped_count;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to migrate existing data to partitioned table
  pgm.sql(`
    CREATE OR REPLACE FUNCTION migrate_audit_logs_to_partitioned()
    RETURNS VOID AS $$
    BEGIN
      -- Insert existing data into partitioned table
      INSERT INTO audit_logs_partitioned 
      SELECT * FROM audit_logs 
      WHERE timestamp >= DATE_TRUNC('year', NOW()) - INTERVAL '1 year';
      
      -- Note: Original audit_logs table should be backed up and dropped manually
      -- after verifying successful migration
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create materialized views for performance optimization
  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_principal_role_assignments AS
    SELECT 
      pr.principal_id,
      pr.role_id,
      r.name as role_name,
      r.tenant_id,
      pr.is_active,
      pr.expires_at,
      pr.granted_at
    FROM principal_roles pr
    JOIN roles r ON pr.role_id = r.id
    WHERE pr.is_active = TRUE
    AND (pr.expires_at IS NULL OR pr.expires_at > NOW());
  `);

  pgm.sql('CREATE UNIQUE INDEX idx_mv_principal_role_assignments ON mv_principal_role_assignments(principal_id, role_id);');
  pgm.sql('GRANT SELECT ON mv_principal_role_assignments TO authz_app_user;');
  pgm.sql('GRANT SELECT ON mv_principal_role_assignments TO authz_system_user;');

  // Create refresh function for materialized view
  pgm.sql(`
    CREATE OR REPLACE FUNCTION refresh_principal_role_assignments()
    RETURNS VOID AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_principal_role_assignments;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create scheduled job table for maintenance tasks
  pgm.createTable('scheduled_jobs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    job_name: {
      type: 'varchar(100)',
      notNull: true,
      unique: true
    },
    cron_expression: {
      type: 'varchar(50)',
      notNull: true
    },
    last_run: {
      type: 'timestamp with time zone'
    },
    next_run: {
      type: 'timestamp with time zone',
      notNull: true
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Insert default maintenance jobs
  pgm.sql(`
    INSERT INTO scheduled_jobs (job_name, cron_expression, next_run) VALUES
    ('refresh_role_assignments', '*/30 * * * *', NOW() + INTERVAL '30 minutes'),
    ('drop_old_audit_partitions', '0 2 1 * *', DATE_TRUNC('month', NOW()) + INTERVAL '1 month' + INTERVAL '2 hours');
  `);
};

exports.down = (pgm) => {
  // Drop scheduled jobs table
  pgm.dropTable('scheduled_jobs');

  // Drop refresh function
  pgm.sql('DROP FUNCTION IF EXISTS refresh_principal_role_assignments();');

  // Drop materialized view
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS mv_principal_role_assignments;');

  // Drop migration function
  pgm.sql('DROP FUNCTION IF EXISTS migrate_audit_logs_to_partitioned();');

  // Drop cleanup function
  pgm.sql('DROP FUNCTION IF EXISTS drop_old_audit_partitions(INTEGER);');

  // Drop view and trigger
  pgm.sql('DROP VIEW IF EXISTS audit_logs;');
  pgm.sql('DROP TRIGGER IF EXISTS audit_log_partition_trigger ON audit_logs_partitioned;');
  pgm.sql('DROP FUNCTION IF EXISTS create_audit_log_partition();');

  // Drop partitions and partitioned table
  const currentYear = new Date().getFullYear();
  for (let month = 1; month <= 12; month++) {
    const partitionName = `audit_logs_${currentYear}_${String(month).padStart(2, '0')}`;
    pgm.sql(`DROP TABLE IF EXISTS ${partitionName};`);
  }
  pgm.sql('DROP TABLE IF EXISTS audit_logs_partitioned;');
};