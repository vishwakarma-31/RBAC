import { BaseServer } from '@rbac-platform/shared/utils/server';
import { Pool } from 'pg';
import type { Request, Response } from 'express';

const PORT = process.env.PORT || 3001;

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

db.on('error', (err) => {
  console.error('Database connection error:', err);
});

class ManagementServer extends BaseServer {
  constructor() {
    super({
      port: PORT,
      serviceName: 'Management API',
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',')
    });

    this.setupRoutes();
  }

  private async handleTenants(req: Request, res: Response) {
    try {
      const result = await db.query('SELECT id, name, description, is_active, created_at FROM tenants ORDER BY name');
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  }

  private async handleTenantById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await db.query('SELECT id, name, description, is_active, created_at FROM tenants WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }
      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  }

  private async handleRoles(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }
      
      const result = await db.query(
        `SELECT r.id, r.name, r.description, r.is_system, r.created_at,
                array_agg(rp.permission_id) as permission_ids
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         WHERE r.tenant_id = $1
         GROUP BY r.id, r.name, r.description, r.is_system, r.created_at
         ORDER BY r.name`,
        [tenantId]
      );
      
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  }

  private async handlePermissions(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }
      
      const result = await db.query(
        'SELECT id, name, description, resource_type, action, created_at FROM permissions WHERE tenant_id = $1 ORDER BY name',
        [tenantId]
      );
      
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }

  private async handlePolicies(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }
      
      const result = await db.query(
        'SELECT id, name, description, version, priority, condition, effect, is_active, created_at FROM policies WHERE tenant_id = $1 ORDER BY priority DESC, name',
        [tenantId]
      );
      
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch policies' });
    }
  }

  private async handleAudit(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }
      
      const result = await db.query(
        'SELECT id, principal_id, action, resource_type, resource_id, allowed, reason, context, evaluated_at FROM audit_logs WHERE tenant_id = $1 ORDER BY evaluated_at DESC LIMIT 100',
        [tenantId]
      );
      
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  private setupRoutes() {
    // Tenants endpoints
    this.addRoute('/api/v1/tenants', this.handleTenants.bind(this));
    this.addRoute('/api/v1/tenants/:id', this.handleTenantById.bind(this));
    
    // Roles endpoints
    this.addRoute('/api/v1/roles', this.handleRoles.bind(this));
    
    // Permissions endpoints
    this.addRoute('/api/v1/permissions', this.handlePermissions.bind(this));
    
    // Policies endpoints
    this.addRoute('/api/v1/policies', this.handlePolicies.bind(this));
    
    // Audit logs endpoints
    this.addRoute('/api/v1/audit', this.handleAudit.bind(this));
  }
}

const server = new ManagementServer();
const httpServer = server.start();

export { httpServer as server };