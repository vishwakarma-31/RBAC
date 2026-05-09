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
      const tenantId = (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000000';
      
      const result = await db.query(
        `SELECT r.id, r.name, r.description, r.is_system_role, r.created_at,
                array_agg(rp.permission_id) as permission_ids
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         WHERE r.tenant_id = $1
         GROUP BY r.id, r.name, r.description, r.is_system_role, r.created_at
         ORDER BY r.name`,
        [tenantId]
      );
      
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  }

  private async handlePermissions(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000000';
      
      const result = await db.query(
        'SELECT id, name, description, resource_type, action, created_at FROM permissions WHERE tenant_id = $1 ORDER BY name',
        [tenantId]
      );
      
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }

  private async handlePolicies(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000000';
      
      const result = await db.query(
        'SELECT id, name, description, version, priority, rules, status, created_at FROM policies WHERE tenant_id = $1 ORDER BY priority DESC, name',
        [tenantId]
      );
      
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error fetching policies:', error);
      res.status(500).json({ error: 'Failed to fetch policies' });
    }
  }

  private async handleAudit(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000000';
      
      const result = await db.query(
        'SELECT id, principal_id, action, resource_type, resource_id, decision, reason, timestamp FROM audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT 100',
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

  private async handleUsers(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000000';
      const result = await db.query(
        'SELECT id, email, name, type, status, created_at FROM principals WHERE tenant_id = $1 ORDER BY name',
        [tenantId]
      );
      res.status(200).json({
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  private async handleOrganizations(req: Request, res: Response) {
    try {
      res.status(200).json([
        { id: 'org1', name: 'Acme Corporation', description: 'Main organization' },
        { id: 'org2', name: 'Stark Industries', description: 'Secondary organization' }
      ]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  }

  private async handleStats(req: Request, res: Response) {
    try {
      res.status(200).json({
        totalUsers: 5,
        totalRoles: 8,
        totalPermissions: 24,
        activePolicies: 12,
        authorizationEvents: [
          { date: '2024-05-01', count: 45 },
          { date: '2024-05-02', count: 52 },
          { date: '2024-05-03', count: 48 },
          { date: '2024-05-04', count: 61 },
          { date: '2024-05-05', count: 55 },
          { date: '2024-05-06', count: 67 },
          { date: '2024-05-07', count: 59 }
        ],
        systemHealth: {
          authzEngine: 'healthy',
          database: 'healthy',
          cache: 'healthy'
        },
        recentActivity: [
          { id: '1', actor: 'admin@example.com', action: 'create_role', resource: 'role:editor', timestamp: new Date().toISOString(), outcome: 'success' },
          { id: '2', actor: 'user1@example.com', action: 'login', resource: 'auth', timestamp: new Date().toISOString(), outcome: 'success' },
          { id: '3', actor: 'admin@example.com', action: 'update_policy', resource: 'policy:read-access', timestamp: new Date().toISOString(), outcome: 'success' }
        ]
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  private async handleAuthMe(req: Request, res: Response) {
    // Return a mock user for now to allow dashboard to bypass login if needed
    res.status(200).json({
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      roles: [{ id: 'r1', name: 'admin' }]
    });
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
    
    // Users endpoints
    this.addRoute('/api/v1/users', this.handleUsers.bind(this));

    // Organizations endpoints
    this.addRoute('/api/v1/organizations', this.handleOrganizations.bind(this));
    
    // Stats endpoints
    this.addRoute('/api/v1/stats', this.handleStats.bind(this));
    
    // Auth endpoints
    this.addRoute('/api/v1/auth/me', this.handleAuthMe.bind(this));
  }
}

const server = new ManagementServer();
const httpServer = server.start();

export { httpServer as server };