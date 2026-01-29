import { User, Role, Permission, Policy, AuditLog, Organization, ApiKey, DashboardStats } from '../types';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API request helper function
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      credentials: 'include', // Include cookies in requests
      ...options.headers,
    },
    ...options,
  };
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(errorData || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Define API endpoints
const ENDPOINTS = {
  USERS: '/users',
  ROLES: '/roles',
  PERMISSIONS: '/permissions',
  POLICIES: '/policies',
  AUDIT_LOGS: '/audit-logs',
  ORGANIZATIONS: '/organizations',
  API_KEYS: '/api-keys',
  AUTH: '/auth',
  STATS: '/stats'
};

// Set up the API functions to use real backend calls instead of mocks

export const userService = {
  getUsers: async (): Promise<User[]> => {
    return apiRequest(ENDPOINTS.USERS);
  },
  
  getUserById: async (id: string): Promise<User | null> => {
    return apiRequest(`${ENDPOINTS.USERS}/${id}`);
  },
  
  createUser: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
    return apiRequest(ENDPOINTS.USERS, {
      method: 'POST',
      body: JSON.stringify(user)
    });
  },
  
  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    return apiRequest(`${ENDPOINTS.USERS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  deleteUser: async (id: string): Promise<void> => {
    return apiRequest(`${ENDPOINTS.USERS}/${id}`, {
      method: 'DELETE'
    });
  },
};

export const roleService = {
  getRoles: async (): Promise<Role[]> => {
    return apiRequest(ENDPOINTS.ROLES);
  },
  
  getRoleById: async (id: string): Promise<Role | null> => {
    return apiRequest(`${ENDPOINTS.ROLES}/${id}`);
  },
  
  createRole: async (role: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'userCount'>): Promise<Role> => {
    return apiRequest(ENDPOINTS.ROLES, {
      method: 'POST',
      body: JSON.stringify(role)
    });
  },
  
  updateRole: async (id: string, updates: Partial<Role>): Promise<Role> => {
    return apiRequest(`${ENDPOINTS.ROLES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  deleteRole: async (id: string): Promise<void> => {
    return apiRequest(`${ENDPOINTS.ROLES}/${id}`, {
      method: 'DELETE'
    });
  },
};

export const permissionService = {
  getPermissions: async (): Promise<Permission[]> => {
    return apiRequest(ENDPOINTS.PERMISSIONS);
  },
  
  getPermissionById: async (id: string): Promise<Permission | null> => {
    return apiRequest(`${ENDPOINTS.PERMISSIONS}/${id}`);
  },
  
  createPermission: async (permission: Omit<Permission, 'id' | 'createdAt'>): Promise<Permission> => {
    return apiRequest(ENDPOINTS.PERMISSIONS, {
      method: 'POST',
      body: JSON.stringify(permission)
    });
  },
};

export const policyService = {
  getPolicies: async (): Promise<Policy[]> => {
    return apiRequest(ENDPOINTS.POLICIES);
  },
  
  getPolicyById: async (id: string): Promise<Policy | null> => {
    return apiRequest(`${ENDPOINTS.POLICIES}/${id}`);
  },
  
  createPolicy: async (policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy> => {
    return apiRequest(ENDPOINTS.POLICIES, {
      method: 'POST',
      body: JSON.stringify(policy)
    });
  },
  
  updatePolicy: async (id: string, updates: Partial<Policy>): Promise<Policy> => {
    return apiRequest(`${ENDPOINTS.POLICIES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  deletePolicy: async (id: string): Promise<void> => {
    return apiRequest(`${ENDPOINTS.POLICIES}/${id}`, {
      method: 'DELETE'
    });
  },
};

export const auditService = {
  getAuditLogs: async (filters?: { startDate?: string; endDate?: string; user?: string; action?: string }): Promise<AuditLog[]> => {
    let url = ENDPOINTS.AUDIT_LOGS;
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
      url += `?${params.toString()}`;
    }
    return apiRequest(url);
  },
  
  exportAuditLogs: async (format: 'csv' | 'json'): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.AUDIT_LOGS}/export?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.blob();
  },
};

export const organizationService = {
  getOrganizations: async (): Promise<Organization[]> => {
    return apiRequest(ENDPOINTS.ORGANIZATIONS);
  },
  
  getOrganizationById: async (id: string): Promise<Organization | null> => {
    return apiRequest(`${ENDPOINTS.ORGANIZATIONS}/${id}`);
  },
  
  createOrganization: async (org: Omit<Organization, 'id' | 'createdAt' | 'userCount' | 'roleCount'>): Promise<Organization> => {
    return apiRequest(ENDPOINTS.ORGANIZATIONS, {
      method: 'POST',
      body: JSON.stringify(org)
    });
  },
};

export const apiKeyService = {
  getApiKeys: async (): Promise<ApiKey[]> => {
    return apiRequest(ENDPOINTS.API_KEYS);
  },
  
  createApiKey: async (name: string): Promise<ApiKey> => {
    return apiRequest(ENDPOINTS.API_KEYS, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },
  
  revokeApiKey: async (id: string): Promise<void> => {
    return apiRequest(`${ENDPOINTS.API_KEYS}/${id}/revoke`, {
      method: 'PUT'
    });
  },
};

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    return apiRequest(ENDPOINTS.STATS);
  },
};

export const authService = {
  login: async (email: string, password: string): Promise<{ user: User, token?: string }> => {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.AUTH}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies in requests
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  register: async (name: string, email: string, password: string, role?: string): Promise<{ user: User, token?: string }> => {
    const userData = { name, email, password };
    if (role) {
      (userData as any).role = role;
    }
    
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.AUTH}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies in requests
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  logout: async (): Promise<void> => {
    // Notify the server about logout
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.AUTH}/logout`, {
        method: 'POST',
        credentials: 'include' // Include cookies in requests
      });
    } catch (error) {
      console.warn('Server logout failed', error);
    }
  },
  
  getCurrentUser: async (): Promise<User> => {
    return apiRequest(`${ENDPOINTS.AUTH}/me`);
  }
};