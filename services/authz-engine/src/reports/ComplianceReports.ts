/**
 * Compliance Reports
 * Generates reports for SOX/GRC requirements and access certifications
 */

import { Pool } from 'pg';
import { AuditLogger } from '../audit/AuditLogger';

export interface AccessCertificationReport {
  tenantId: string;
  reportDate: Date;
  totalUsers: number;
  usersWithAccess: number;
  usersWithoutAccess: number;
  roleAssignments: number;
  accessPatterns: {
    user: string;
    roles: string[];
    permissions: string[];
    lastAccessDate: Date;
    accessFrequency: number;
  }[];
}

export interface SegregationOfDutiesReport {
  tenantId: string;
  reportDate: Date;
  violations: {
    userId: string;
    roles: string[];
    violationType: string; // Changed from 'static' | 'dynamic' to string to match the constraint_type values
    severity: 'high' | 'medium' | 'low';
    description: string;
  }[];
}

export interface AccessReviewReport {
  tenantId: string;
  reviewerId: string;
  reviewPeriodStart: Date;
  reviewPeriodEnd: Date;
  usersReviewed: number;
  accessesConfirmed: number;
  accessesRevoked: number;
  exceptionsFlagged: number;
}

export class ComplianceReports {
  private dbPool: Pool;
  private auditLogger: AuditLogger;

  constructor(dbPool: Pool, auditLogger: AuditLogger) {
    this.dbPool = dbPool;
    this.auditLogger = auditLogger;
  }

  /**
   * Generate an access certification report
   */
  async generateAccessCertificationReport(tenantId: string): Promise<AccessCertificationReport> {
    // Get all users in the tenant
    const usersQuery = {
      text: `SELECT id, username, email, created_at 
             FROM principals 
             WHERE tenant_id = $1 AND is_active = true`,
      values: [tenantId]
    };
    
    const usersResult = await this.dbPool.query(usersQuery);
    
    // Get role assignments for each user
    const accessPatterns = await Promise.all(
      usersResult.rows.map(async (user: any) => {
        // Get roles for this user
        const rolesQuery = {
          text: `SELECT r.name 
                 FROM roles r
                 JOIN principal_roles pr ON r.id = pr.role_id
                 WHERE pr.principal_id = $1 AND pr.is_active = true`,
          values: [user.id]
        };
        
        const rolesResult = await this.dbPool.query(rolesQuery);
        const roles = rolesResult.rows.map((row: any) => row.name);
        
        // Get permissions for this user (through roles)
        const permissionsQuery = {
          text: `SELECT DISTINCT p.name 
                 FROM permissions p
                 JOIN role_permissions rp ON p.id = rp.permission_id
                 JOIN principal_roles pr ON rp.role_id = pr.role_id
                 WHERE pr.principal_id = $1 AND pr.is_active = true`,
          values: [user.id]
        };
        
        const permissionsResult = await this.dbPool.query(permissionsQuery);
        const permissions = permissionsResult.rows.map((row: any) => row.name);
        
        // Get last access date and frequency from audit logs
        const auditLogs = await this.auditLogger.getPrincipalLogs(user.id, 10);
        const lastAccessDate = auditLogs.length > 0 ? 
          new Date(Math.max(...auditLogs.map(log => new Date(log.timestamp).getTime()))) : 
          new Date(user.created_at);
          
        const accessFrequency = auditLogs.length;
        
        return {
          user: user.username,
          roles,
          permissions,
          lastAccessDate,
          accessFrequency
        };
      })
    );

    return {
      tenantId,
      reportDate: new Date(),
      totalUsers: usersResult.rows.length,
      usersWithAccess: accessPatterns.filter(pattern => pattern.roles.length > 0).length,
      usersWithoutAccess: accessPatterns.filter(pattern => pattern.roles.length === 0).length,
      roleAssignments: accessPatterns.reduce((sum, pattern) => sum + pattern.roles.length, 0),
      accessPatterns
    };
  }

  /**
   * Generate a segregation of duties report
   */
  async generateSegregationOfDutiesReport(tenantId: string): Promise<SegregationOfDutiesReport> {
    // Get role constraints for the tenant
    const constraintsQuery = {
      text: `SELECT id, name, description, constraint_type, role_set, violation_action
             FROM role_constraints
             WHERE tenant_id = $1`,
      values: [tenantId]
    };
    
    const constraintsResult = await this.dbPool.query(constraintsQuery);
    
    // Check for violations by finding users who have mutually exclusive roles
    const violations = [];
    
    for (const constraint of constraintsResult.rows as Array<{ id: string; name: string; description: string; constraint_type: string; role_set: string[]; violation_action: string }>) {
      // For each constraint, check if any user has more than one of the mutually exclusive roles
      const roleSet = Array.isArray(constraint.role_set) ? constraint.role_set : [constraint.role_set];
      
      if (roleSet.length < 2) continue; // Need at least 2 roles to have a potential violation
      
      // Find users who have more than one role from the mutually exclusive set
      const violationQuery = {
        text: `SELECT pr.principal_id, STRING_AGG(r.name, ', ') as roles
               FROM principal_roles pr
               JOIN roles r ON pr.role_id = r.id
               WHERE pr.tenant_id = $1 
                 AND pr.role_id = ANY($2::uuid[])
                 AND pr.is_active = true
               GROUP BY pr.principal_id
               HAVING COUNT(pr.role_id) > 1`,
        values: [tenantId, roleSet]
      };
      
      const violationResult = await this.dbPool.query(violationQuery);
      
      for (const row of violationResult.rows) {
        violations.push({
          userId: row.principal_id,
          roles: row.roles.split(', '),
          violationType: constraint.constraint_type === 'static_sod' ? 'static' : 'dynamic',
          severity: 'high' as 'high' | 'medium' | 'low', // Could be determined by constraint properties
          description: `User ${row.principal_id} has roles ${row.roles} which violate constraint "${constraint.name}"`
        });
      }
    }

    return {
      tenantId,
      reportDate: new Date(),
      violations
    };
  }

  /**
   * Generate an access review report
   */
  async generateAccessReviewReport(
    tenantId: string, 
    reviewerId: string, 
    periodStart: Date, 
    periodEnd: Date
  ): Promise<AccessReviewReport> {
    // Get all access reviews performed by the reviewer in the specified period
    const reviewQuery = {
      text: `SELECT * FROM audit_logs
             WHERE tenant_id = $1
               AND action = 'access_review'
               AND principal_id = $2
               AND timestamp BETWEEN $3 AND $4`,
      values: [tenantId, reviewerId, periodStart, periodEnd]
    };
    
    const reviewResult = await this.dbPool.query(reviewQuery);
    
    // Calculate metrics
    let usersReviewed = 0;
    let accessesConfirmed = 0;
    let accessesRevoked = 0;
    let exceptionsFlagged = 0;
    
    for (const log of reviewResult.rows) {
      if (log.metadata) {
        const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        if (meta.users_reviewed) usersReviewed += meta.users_reviewed;
        if (meta.accesses_confirmed) accessesConfirmed += meta.accesses_confirmed;
        if (meta.accesses_revoked) accessesRevoked += meta.accesses_revoked;
        if (meta.exceptions_flagged) exceptionsFlagged += meta.exceptions_flagged;
      }
    }
    
    return {
      tenantId,
      reviewerId,
      reviewPeriodStart: periodStart,
      reviewPeriodEnd: periodEnd,
      usersReviewed,
      accessesConfirmed,
      accessesRevoked,
      exceptionsFlagged
    };
  }

  /**
   * Get authorization activity trends
   */
  async getAuthorizationTrends(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    dailyActivity: { date: string; allowed: number; denied: number }[];
    topResources: { resourceType: string; resourceId: string; count: number }[];
    topActions: { action: string; count: number }[];
    suspiciousActivities: { principalId: string; count: number; details: string }[];
  }> {
    // Get daily authorization activity
    const dailyQuery = {
      text: `SELECT 
               DATE(timestamp) as date,
               SUM(CASE WHEN allowed THEN 1 ELSE 0 END) as allowed,
               SUM(CASE WHEN NOT allowed THEN 1 ELSE 0 END) as denied
             FROM audit_logs
             WHERE tenant_id = $1
               AND timestamp BETWEEN $2 AND $3
             GROUP BY DATE(timestamp)
             ORDER BY date`,
      values: [tenantId, startDate, endDate]
    };
    
    const dailyResult = await this.dbPool.query(dailyQuery);
    const dailyActivity = dailyResult.rows.map(row => ({
      date: row.date,
      allowed: parseInt(row.allowed) || 0,
      denied: parseInt(row.denied) || 0
    }));

    // Get top resources accessed
    const topResourcesQuery = {
      text: `SELECT resource_type, resource_id, COUNT(*) as count
             FROM audit_logs
             WHERE tenant_id = $1
               AND timestamp BETWEEN $2 AND $3
             GROUP BY resource_type, resource_id
             ORDER BY count DESC
             LIMIT 10`,
      values: [tenantId, startDate, endDate]
    };
    
    const topResourcesResult = await this.dbPool.query(topResourcesQuery);
    const topResources = topResourcesResult.rows.map(row => ({
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      count: parseInt(row.count)
    }));

    // Get top actions performed
    const topActionsQuery = {
      text: `SELECT action, COUNT(*) as count
             FROM audit_logs
             WHERE tenant_id = $1
               AND timestamp BETWEEN $2 AND $3
             GROUP BY action
             ORDER BY count DESC
             LIMIT 10`,
      values: [tenantId, startDate, endDate]
    };
    
    const topActionsResult = await this.dbPool.query(topActionsQuery);
    const topActions = topActionsResult.rows.map(row => ({
      action: row.action,
      count: parseInt(row.count)
    }));

    // Identify potentially suspicious activities (unusual access patterns)
    const suspiciousQuery = {
      text: `SELECT principal_id, COUNT(*) as count
             FROM audit_logs
             WHERE tenant_id = $1
               AND timestamp BETWEEN $2 AND $3
               AND allowed = false
             GROUP BY principal_id
             HAVING COUNT(*) > 10  -- Threshold for suspicious activity
             ORDER BY count DESC
             LIMIT 10`,
      values: [tenantId, startDate, endDate]
    };
    
    const suspiciousResult = await this.dbPool.query(suspiciousQuery);
    const suspiciousActivities = suspiciousResult.rows.map(row => ({
      principalId: row.principal_id,
      count: parseInt(row.count),
      details: `Had ${row.count} failed authorization attempts`
    }));

    return {
      dailyActivity,
      topResources,
      topActions,
      suspiciousActivities
    };
  }

  /**
   * Export compliance data in various formats
   */
  async exportComplianceData(
    tenantId: string,
    format: 'json' | 'csv' | 'pdf',
    reportTypes: ('access-certification' | 'sod' | 'authorization-trends')[]
  ): Promise<Buffer> {
    // This would implement actual export functionality
    // For now, returning a placeholder buffer
    const data: Record<string, any> = {};
    
    if (reportTypes.includes('access-certification')) {
      data.accessCertification = await this.generateAccessCertificationReport(tenantId);
    }
    
    if (reportTypes.includes('sod')) {
      data.segregationOfDuties = await this.generateSegregationOfDutiesReport(tenantId);
    }
    
    if (reportTypes.includes('authorization-trends')) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      data.authorizationTrends = await this.getAuthorizationTrends(tenantId, thirtyDaysAgo, now);
    }
    
    if (format === 'json') {
      return Buffer.from(JSON.stringify(data, null, 2));
    } else if (format === 'csv') {
      // Convert to CSV format
      return Buffer.from(this.convertToCSV(data));
    } else {
      // For PDF, we'd need a PDF library
      return Buffer.from(JSON.stringify(data, null, 2)); // Fallback to JSON
    }
  }

  /**
   * Helper to convert data to CSV format
   */
  private convertToCSV(data: Record<string, any>): string {
    // Simplified CSV conversion - in a real implementation, this would be more robust
    return JSON.stringify(data);
  }
}