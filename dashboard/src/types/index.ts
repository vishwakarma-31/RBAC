export interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  roles: Role[];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'read' | 'write' | 'update' | 'delete' | 'manage';
  description: string;
  tags: string[];
  createdAt: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  type: 'rbac' | 'abac' | 'hybrid';
  version: string;
  content: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource: string;
  timestamp: string;
  outcome: 'success' | 'failure';
  details?: Record<string, any>;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  userCount: number;
  roleCount: number;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsed?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  activePolicies: number;
  recentActivity: AuditLog[];
  authorizationEvents: { date: string; count: number }[];
  systemHealth: {
    authzEngine: 'healthy' | 'degraded' | 'down';
    database: 'healthy' | 'degraded' | 'down';
    cache: 'healthy' | 'degraded' | 'down';
  };
}