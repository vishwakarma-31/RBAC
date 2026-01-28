import { BaseServer } from '@rbac-platform/shared/utils/server';
import { Pool } from 'pg';
import type { Request, Response } from 'express';

const PORT = process.env.PORT || 3002;

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

db.on('error', (err) => {
  console.error('Database connection error:', err);
});

class AuditServer extends BaseServer {
  constructor() {
    super({
      port: PORT,
      serviceName: 'Audit Service',
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',')
    });

    this.setupRoutes();
  }

  private async handleLogs(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }
      
      const { limit = '100', offset = '0' } = req.query as { limit?: string; offset?: string };
      
      const result = await db.query(
        `SELECT id, principal_id, action, resource_type, resource_id, allowed, reason, context, evaluated_at
         FROM audit_logs
         WHERE tenant_id = $1
         ORDER BY evaluated_at DESC
         LIMIT $2 OFFSET $3`,
        [tenantId, parseInt(limit), parseInt(offset)]
      );
      
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  private async handleExport(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }
      
      const result = await db.query(
        `SELECT principal_id, action, resource_type, resource_id, allowed, reason, evaluated_at
         FROM audit_logs
         WHERE tenant_id = $1
         ORDER BY evaluated_at DESC`,
        [tenantId]
      );
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      
      // Write CSV header
      res.write('principal_id,action,resource_type,resource_id,allowed,reason,evaluated_at\n');
      
      // Write data rows
      for (const row of result.rows) {
        res.write(`${row.principal_id},${row.action},${row.resource_type},${row.resource_id},${row.allowed},${row.reason},${row.evaluated_at}\n`);
      }
      
      res.end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to export audit logs' });
    }
  }

  private async handleCompliance(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }
      
      const [totalLogs, deniedCount, allowedCount] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM audit_logs WHERE tenant_id = $1', [tenantId]),
        db.query('SELECT COUNT(*) as count FROM audit_logs WHERE tenant_id = $1 AND allowed = false', [tenantId]),
        db.query('SELECT COUNT(*) as count FROM audit_logs WHERE tenant_id = $1 AND allowed = true', [tenantId])
      ]);
      
      res.status(200).json({
        total_logs: parseInt(totalLogs.rows[0].count),
        denied_count: parseInt(deniedCount.rows[0].count),
        allowed_count: parseInt(allowedCount.rows[0].count),
        compliance_rate: (parseInt(allowedCount.rows[0].count) / parseInt(totalLogs.rows[0].count) * 100).toFixed(2) + '%'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch compliance data' });
    }
  }

  private setupRoutes() {
    // Audit logs endpoints
    this.addRoute('/api/v1/logs', this.handleLogs.bind(this));
    
    // Export audit logs
    this.addRoute('/api/v1/export', this.handleExport.bind(this));
    
    // Compliance summary
    this.addRoute('/api/v1/compliance', this.handleCompliance.bind(this));
  }
}

const server = new AuditServer();
const httpServer = server.start();

export { httpServer as server };