import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { dashboardService } from '../services/api';
import { DashboardStats, AuditLog } from '../types';
import { 
  UserGroupIcon, 
  ShieldCheckIcon, 
  KeyIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export const Dashboard: React.FC = () => {
  const { stats, loading: dataLoading, refreshStats } = useData();
  
  const loading = dataLoading.stats;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>Error loading dashboard data</div>;
  }

  const healthStatus = {
    healthy: { icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-100' },
    degraded: { icon: ExclamationTriangleIcon, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    down: { icon: XCircleIcon, color: 'text-red-500', bg: 'bg-red-100' },
  };

  const getHealthIcon = (status: string) => {
    const config = healthStatus[status as keyof typeof healthStatus] || healthStatus.degraded;
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/users" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/roles" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Roles</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalRoles}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/permissions" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100">
                <KeyIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Permissions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPermissions}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/policies" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <DocumentTextIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Policies</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activePolicies}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authorization Events Chart */}
        <Card title="Authorization Events (Last 7 Days)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.authorizationEvents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* System Health */}
        <Card title="System Health">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gray-200">
                  {getHealthIcon(stats.systemHealth.authzEngine)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Authorization Engine</p>
                  <p className="text-xs text-gray-500">Policy evaluation service</p>
                </div>
              </div>
              <Badge variant={stats.systemHealth.authzEngine === 'healthy' ? 'success' : stats.systemHealth.authzEngine === 'degraded' ? 'warning' : 'danger'}>
                {stats.systemHealth.authzEngine}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gray-200">
                  {getHealthIcon(stats.systemHealth.database)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Database</p>
                  <p className="text-xs text-gray-500">PostgreSQL cluster</p>
                </div>
              </div>
              <Badge variant={stats.systemHealth.database === 'healthy' ? 'success' : stats.systemHealth.database === 'degraded' ? 'warning' : 'danger'}>
                {stats.systemHealth.database}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-gray-200">
                  {getHealthIcon(stats.systemHealth.cache)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Cache</p>
                  <p className="text-xs text-gray-500">Redis cluster</p>
                </div>
              </div>
              <Badge variant={stats.systemHealth.cache === 'healthy' ? 'success' : stats.systemHealth.cache === 'degraded' ? 'warning' : 'danger'}>
                {stats.systemHealth.cache}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card title="Recent Activity">
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentActivity.map((log: AuditLog) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.actor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.resource}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={log.outcome === 'success' ? 'success' : 'danger'}>
                      {log.outcome}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};