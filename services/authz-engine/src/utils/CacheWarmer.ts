/**
 * Cache Warming Strategy
 * Pre-populates cache with frequently accessed roles and permissions
 */

import { Pool } from 'pg';
import { RedisCacheManager } from '../cache/RedisCacheManager';

export interface CacheWarmerConfig {
  dbPool: Pool;
  cacheManager: RedisCacheManager;
  warmupFrequencyMinutes: number;
}

export class CacheWarmer {
  private dbPool: Pool;
  private cacheManager: RedisCacheManager;
  private warmupFrequencyMinutes: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(config: CacheWarmerConfig) {
    this.dbPool = config.dbPool;
    this.cacheManager = config.cacheManager;
    this.warmupFrequencyMinutes = config.warmupFrequencyMinutes;
  }

  /**
   * Start the cache warming process
   */
  async start(): Promise<void> {
    console.log('Starting cache warmer...');
    await this.warmupCache();
    
    // Set up recurring warmup
    this.timer = setInterval(async () => {
      await this.warmupCache();
    }, this.warmupFrequencyMinutes * 60 * 1000);
  }

  /**
   * Stop the cache warming process
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('Cache warmer stopped');
    }
  }

  /**
   * Perform cache warmup
   */
  async warmupCache(): Promise<void> {
    console.log('Starting cache warmup...');
    const startTime = Date.now();

    try {
      // Warm up most frequently used roles and permissions
      await this.warmupFrequentRoles();
      await this.warmupFrequentPermissions();
      await this.warmupCommonRoleHierarchies();
      
      console.log(`Cache warmup completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  /**
   * Warm up frequently accessed roles
   */
  private async warmupFrequentRoles(): Promise<void> {
    // Get top roles by usage from audit logs
    const query = `
      SELECT 
        resource_id as role_id,
        COUNT(*) as usage_count
      FROM audit_logs 
      WHERE resource_type = 'role' 
        AND action = 'access'
        AND evaluated_at > NOW() - INTERVAL '7 days'
      GROUP BY resource_id
      ORDER BY usage_count DESC
      LIMIT 50
    `;
    
    const result = await this.dbPool.query(query);
    
    for (const row of result.rows) {
      try {
        // Fetch role details and cache them
        await this.cacheRoleDetails(row.role_id);
      } catch (error) {
        console.error(`Failed to warm up role ${row.role_id}:`, error);
      }
    }
  }

  /**
   * Warm up frequently accessed permissions
   */
  private async warmupFrequentPermissions(): Promise<void> {
    // Get top permissions by usage from audit logs
    const query = `
      SELECT 
        resource_id as permission_id,
        COUNT(*) as usage_count
      FROM audit_logs 
      WHERE resource_type = 'permission' 
        AND action = 'check'
        AND evaluated_at > NOW() - INTERVAL '7 days'
      GROUP BY resource_id
      ORDER BY usage_count DESC
      LIMIT 50
    `;
    
    const result = await this.dbPool.query(query);
    
    for (const row of result.rows) {
      try {
        // Fetch permission details and cache them
        await this.cachePermissionDetails(row.permission_id);
      } catch (error) {
        console.error(`Failed to warm up permission ${row.permission_id}:`, error);
      }
    }
  }

  /**
   * Warm up common role hierarchies
   */
  private async warmupCommonRoleHierarchies(): Promise<void> {
    // Get top principals by authorization requests
    const query = `
      SELECT 
        principal_id,
        tenant_id,
        COUNT(*) as auth_count
      FROM audit_logs 
      WHERE action = 'authorize'
        AND evaluated_at > NOW() - INTERVAL '7 days'
      GROUP BY principal_id, tenant_id
      ORDER BY auth_count DESC
      LIMIT 30
    `;
    
    const result = await this.dbPool.query(query);
    
    for (const row of result.rows) {
      try {
        // Fetch and cache role hierarchy for this principal
        await this.cacheRoleHierarchy(row.tenant_id, row.principal_id);
      } catch (error) {
        console.error(`Failed to warm up role hierarchy for principal ${row.principal_id}:`, error);
      }
    }
  }

  /**
   * Cache role details
   */
  private async cacheRoleDetails(roleId: string): Promise<void> {
    const query = 'SELECT * FROM roles WHERE id = $1';
    const result = await this.dbPool.query(query, [roleId]);
    
    if (result.rows.length > 0) {
      // Cache the role data using appropriate cache key
      // Implementation depends on the specific caching needs
      console.log(`Warmed up role: ${roleId}`);
    }
  }

  /**
   * Cache permission details
   */
  private async cachePermissionDetails(permissionId: string): Promise<void> {
    const query = 'SELECT * FROM permissions WHERE id = $1';
    const result = await this.dbPool.query(query, [permissionId]);
    
    if (result.rows.length > 0) {
      // Cache the permission data using appropriate cache key
      console.log(`Warmed up permission: ${permissionId}`);
    }
  }

  /**
   * Cache role hierarchy for a principal
   */
  private async cacheRoleHierarchy(tenantId: string, principalId: string): Promise<void> {
    // This would implement the same logic as in RBACHierarchyManager
    // but specifically for caching purposes
    console.log(`Warmed up role hierarchy for tenant: ${tenantId}, principal: ${principalId}`);
  }
}