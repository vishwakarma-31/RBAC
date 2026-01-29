import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, Permission, Policy, Organization, DashboardStats } from '../types';
import { userService, roleService, permissionService, policyService, organizationService, dashboardService } from '../services/api';

interface DataContextType {
  // Data arrays
  users: User[];
  roles: Role[];
  permissions: Permission[];
  policies: Policy[];
  organizations: Organization[];
  
  // Stats
  stats: DashboardStats | null;
  
  // Loading states
  loading: {
    users: boolean;
    roles: boolean;
    permissions: boolean;
    policies: boolean;
    organizations: boolean;
    stats: boolean;
  };
  
  // Refresh functions
  refreshUsers: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  refreshPolicies: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Current organization
  currentOrganization: string;
  setCurrentOrganization: (org: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<string>('Acme Corporation');
  
  const [loading, setLoading] = useState({
    users: false,
    roles: false,
    permissions: false,
    policies: false,
    organizations: false,
    stats: false
  });

  const refreshUsers = async () => {
    try {
      console.log('DataContext: Fetching users');
      setLoading(prev => ({ ...prev, users: true }));
      const data = await userService.getUsers();
      console.log('DataContext: Users fetched:', data.length);
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const refreshRoles = async () => {
    try {
      console.log('DataContext: Fetching roles');
      setLoading(prev => ({ ...prev, roles: true }));
      const data = await roleService.getRoles();
      console.log('DataContext: Roles fetched:', data.length);
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(prev => ({ ...prev, roles: false }));
    }
  };

  const refreshPermissions = async () => {
    try {
      console.log('DataContext: Fetching permissions');
      setLoading(prev => ({ ...prev, permissions: true }));
      const data = await permissionService.getPermissions();
      console.log('DataContext: Permissions fetched:', data.length);
      setPermissions(data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(prev => ({ ...prev, permissions: false }));
    }
  };

  const refreshPolicies = async () => {
    try {
      console.log('DataContext: Fetching policies');
      setLoading(prev => ({ ...prev, policies: true }));
      const data = await policyService.getPolicies();
      console.log('DataContext: Policies fetched:', data.length);
      setPolicies(data);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    } finally {
      setLoading(prev => ({ ...prev, policies: false }));
    }
  };

  const refreshOrganizations = async () => {
    try {
      setLoading(prev => ({ ...prev, organizations: true }));
      const data = await organizationService.getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(prev => ({ ...prev, organizations: false }));
    }
  };

  const refreshStats = async () => {
    try {
      console.log('DataContext: Fetching stats');
      setLoading(prev => ({ ...prev, stats: true }));
      const data = await dashboardService.getStats();
      console.log('DataContext: Stats fetched');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const refreshAll = async () => {
    // Set all loading states to true initially
    setLoading({
      users: true,
      roles: true,
      permissions: true,
      policies: true,
      organizations: true,
      stats: true
    });
    
    await Promise.all([
      refreshUsers(),
      refreshRoles(),
      refreshPermissions(),
      refreshPolicies(),
      refreshOrganizations(),
      refreshStats()
    ]);
  };

  // Initial load
  useEffect(() => {
    console.log('DataContext: Starting initial load');
    refreshAll();
  }, []);

  // Refresh data when organization changes
  useEffect(() => {
    console.log('DataContext: Organization changed to', currentOrganization);
    refreshAll();
  }, [currentOrganization]);

  const value: DataContextType = {
    users,
    roles,
    permissions,
    policies,
    organizations,
    stats,
    loading,
    refreshUsers,
    refreshRoles,
    refreshPermissions,
    refreshPolicies,
    refreshOrganizations,
    refreshStats,
    refreshAll,
    currentOrganization,
    setCurrentOrganization
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};