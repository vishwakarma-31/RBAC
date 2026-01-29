/**
 * Audit Logger
 * Records authorization decisions for compliance and debugging
 */

import { Pool } from 'pg';
import { AuthorizationRequest, AuthorizationResponse } from '../authorization/AuthorizationEngine';
import config from '../config';

export interface AuditLogEntry {
  id?: string;
  tenant_id: string;
  principal_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  allowed: boolean;
  reason: string;
  policy_evaluated?: string;
  request_hash?: string;
  previous_hash?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private dbPool: Pool;
  private enabled: boolean;

  constructor(dbPool?: Pool) {
    this.dbPool = dbPool || new Pool({
      connectionString: config.database.connectionString,
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeoutMs,
      connectionTimeoutMillis: config.database.connectionTimeoutMs,
    });
    
    // Check if auditing is enabled via config
    this.enabled = process.env.ENABLE_AUDIT_LOGGING?.toLowerCase() !== 'false';
  }

  /**
   * Log an authorization decision
   */
  async logAuthorizationDecision(
    request: AuthorizationRequest,
    response: AuthorizationResponse,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const logEntry: AuditLogEntry = {
        tenant_id: request.tenantId,
        principal_id: request.principalId,
        action: request.action,
        resource_type: request.resource.type,
        resource_id: request.resource.id,
        allowed: response.allowed,
        reason: response.reason,
        policy_evaluated: response.policy_evaluated,
        timestamp: response.evaluated_at,
        metadata: {
          ...additionalMetadata,
          resource_attributes: request.resource.attributes,
          principal_attributes: request.principal?.attributes,
          context: request.context,
          cache_hit: response.cache_hit,
          explanation: response.explanation,
          failed_conditions: response.failed_conditions
        }
      };

      await this.insertLogEntry(logEntry);
    } catch (error) {
      console.error('Failed to log authorization decision:', error);
      // Don't throw error as this shouldn't affect the authorization decision
    }
  }

  /**
   * Insert a log entry into the database
   */
  private async insertLogEntry(entry: AuditLogEntry): Promise<void> {
    // Calculate request hash for tamper detection
    const requestHash = this.calculateRequestHash(entry);
    
    const query = {
      text: `INSERT INTO audit_logs(
        tenant_id, 
        principal_id, 
        action, 
        resource_type, 
        resource_id, 
        allowed, 
        reason, 
        policy_evaluated, 
        request_hash,
        previous_hash,
        timestamp,
        context
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      values: [
        entry.tenant_id,
        entry.principal_id,
        entry.action,
        entry.resource_type,
        entry.resource_id,
        entry.allowed,
        entry.reason,
        entry.policy_evaluated,
        requestHash,
        entry.previous_hash,
        entry.timestamp,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      ]
    };

    await this.dbPool.query(query);
  }

  /**
   * Calculate a hash of the request for tamper detection
   */
  private calculateRequestHash(entry: AuditLogEntry): string {
    const crypto = require('crypto');
    const data = JSON.stringify({
      tenant_id: entry.tenant_id,
      principal_id: entry.principal_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      allowed: entry.allowed,
      reason: entry.reason,
      timestamp: entry.timestamp,
      metadata: entry.metadata
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get recent audit logs for a tenant
   */
  async getRecentLogs(tenantId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    const query = {
      text: `SELECT * FROM audit_logs 
             WHERE tenant_id = $1 
             ORDER BY timestamp DESC 
             LIMIT $2`,
      values: [tenantId, limit]
    };

    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp)
    }));
  }

  /**
   * Get authorization decisions for a specific principal
   */
  async getPrincipalLogs(principalId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const query = {
      text: `SELECT * FROM audit_logs 
             WHERE principal_id = $1 
             ORDER BY timestamp DESC 
             LIMIT $2`,
      values: [principalId, limit]
    };

    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp)
    }));
  }

  /**
   * Get authorization decisions for a specific resource
   */
  async getResourceLogs(resourceType: string, resourceId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const query = {
      text: `SELECT * FROM audit_logs 
             WHERE resource_type = $1 AND resource_id = $2
             ORDER BY timestamp DESC 
             LIMIT $3`,
      values: [resourceType, resourceId, limit]
    };

    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp)
    }));
  }

  /**
   * Count authorization decisions by outcome for a tenant
   */
  async getDecisionCounts(tenantId: string): Promise<{ allowed: number; denied: number }> {
    const query = {
      text: `SELECT 
               SUM(CASE WHEN allowed THEN 1 ELSE 0 END) as allowed_count,
               SUM(CASE WHEN NOT allowed THEN 1 ELSE 0 END) as denied_count
             FROM audit_logs 
             WHERE tenant_id = $1`,
      values: [tenantId]
    };

    const result = await this.dbPool.query(query);
    const row = result.rows[0];
    
    return {
      allowed: parseInt(row.allowed_count) || 0,
      denied: parseInt(row.denied_count) || 0
    };
  }

  /**
   * Enable or disable audit logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if audit logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.dbPool.end();
  }
}