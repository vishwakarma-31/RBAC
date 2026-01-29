/**
 * Event-Driven Cache Invalidation System
 * Coordinates cache updates between cache and database
 */

import { RedisCacheManager } from './RedisCacheManager';
import { Pool } from 'pg';

export interface CacheInvalidationEvent {
  eventType: 'role_assigned' | 'role_revoked' | 'permission_granted' | 'permission_revoked' | 'role_created' | 'role_deleted';
  tenantId: string;
  entityId: string; // role ID, permission ID, or principal ID
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CacheInvalidationListener {
  onInvalidation(event: CacheInvalidationEvent): void;
}

export class EventDrivenInvalidator {
  private cacheManager: RedisCacheManager;
  private dbPool: Pool;
  private listeners: CacheInvalidationListener[] = [];

  constructor(cacheManager: RedisCacheManager, dbPool: Pool) {
    this.cacheManager = cacheManager;
    this.dbPool = dbPool;
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribe(listener: CacheInvalidationListener): void {
    this.listeners.push(listener);
  }

  /**
   * Unsubscribe from cache invalidation events
   */
  unsubscribe(listener: CacheInvalidationListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit a cache invalidation event and notify all listeners
   */
  private emitEvent(event: CacheInvalidationEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener.onInvalidation(event);
      } catch (error) {
        console.error('Error in cache invalidation listener:', error);
      }
    });
  }

  /**
   * Invalidate cache for role assignment
   */
  async invalidateForRoleAssignment(tenantId: string, principalId: string): Promise<void> {
    // Invalidate the specific principal's authorization cache
    await this.cacheManager.invalidateAuthorizationCache(tenantId, principalId);

    // Emit event for distributed systems
    const event: CacheInvalidationEvent = {
      eventType: 'role_assigned',
      tenantId,
      entityId: principalId,
      timestamp: new Date(),
      metadata: { action: 'invalidate_authorization_cache' }
    };
    
    this.emitEvent(event);
  }

  /**
   * Invalidate cache for role revocation
   */
  async invalidateForRoleRevocation(tenantId: string, principalId: string): Promise<void> {
    // Invalidate the specific principal's authorization cache
    await this.cacheManager.invalidateAuthorizationCache(tenantId, principalId);

    // Emit event for distributed systems
    const event: CacheInvalidationEvent = {
      eventType: 'role_revoked',
      tenantId,
      entityId: principalId,
      timestamp: new Date(),
      metadata: { action: 'invalidate_authorization_cache' }
    };
    
    this.emitEvent(event);
  }

  /**
   * Invalidate cache for permission changes
   */
  async invalidateForPermissionChange(tenantId: string, roleId: string): Promise<void> {
    // Find all principals with this role and invalidate their caches
    const principals = await this.getPrincipalsWithRole(tenantId, roleId);
    
    for (const principalId of principals) {
      await this.cacheManager.invalidateAuthorizationCache(tenantId, principalId);
    }

    // Emit event for distributed systems
    const event: CacheInvalidationEvent = {
      eventType: 'permission_granted', // or revoked
      tenantId,
      entityId: roleId,
      timestamp: new Date(),
      metadata: { 
        action: 'invalidate_role_permissions_cache',
        affectedPrincipals: principals 
      }
    };
    
    this.emitEvent(event);
  }

  /**
   * Get all principals that have a specific role
   */
  private async getPrincipalsWithRole(tenantId: string, roleId: string): Promise<string[]> {
    const query = {
      text: `SELECT DISTINCT principal_id 
             FROM principal_roles 
             WHERE role_id = $1 AND tenant_id = $2 AND is_active = true`,
      values: [roleId, tenantId]
    };
    
    const result = await this.dbPool.query(query);
    return result.rows.map(row => row.principal_id);
  }

  /**
   * Invalidate cache for role creation/deletion
   */
  async invalidateForRoleChange(tenantId: string, roleId: string): Promise<void> {
    // Find all principals that had this role and invalidate their caches
    const principals = await this.getPrincipalsWithRole(tenantId, roleId);
    
    for (const principalId of principals) {
      await this.cacheManager.invalidateAuthorizationCache(tenantId, principalId);
    }

    // Emit event for distributed systems
    const event: CacheInvalidationEvent = {
      eventType: 'role_created', // or deleted
      tenantId,
      entityId: roleId,
      timestamp: new Date(),
      metadata: { 
        action: 'invalidate_role_cache',
        affectedPrincipals: principals 
      }
    };
    
    this.emitEvent(event);
  }

  /**
   * Process batch invalidations
   */
  async processBatchInvalidations(events: CacheInvalidationEvent[]): Promise<void> {
    for (const event of events) {
      await this.processSingleEvent(event);
    }
  }

  /**
   * Process a single invalidation event
   */
  private async processSingleEvent(event: CacheInvalidationEvent): Promise<void> {
    switch (event.eventType) {
      case 'role_assigned':
        await this.invalidateForRoleAssignment(event.tenantId, event.entityId);
        break;
      case 'role_revoked':
        await this.invalidateForRoleRevocation(event.tenantId, event.entityId);
        break;
      case 'permission_granted':
      case 'permission_revoked':
        await this.invalidateForPermissionChange(event.tenantId, event.entityId);
        break;
      case 'role_created':
      case 'role_deleted':
        await this.invalidateForRoleChange(event.tenantId, event.entityId);
        break;
      default:
        console.warn(`Unknown event type: ${(event as any).eventType}`);
    }
  }
}