import React, { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If user is not authenticated, redirect to login
  if (!isLoading && !user) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="outline" size="sm">
          {sidebarOpen ? 'Close' : 'Menu'}
        </Button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">RBAC Admin</h1>
          <Badge variant="secondary">{user?.roles?.[0]?.name || 'User'}</Badge>
        </div>
        <nav className="p-2">
          <ul className="space-y-1">
            <li>
              <a href="/dashboard" className="flex items-center p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <span className="ml-3">Dashboard</span>
              </a>
            </li>
            <li>
              <a href="/users" className="flex items-center p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <span className="ml-3">Users</span>
              </a>
            </li>
            <li>
              <a href="/roles" className="flex items-center p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <span className="ml-3">Roles</span>
              </a>
            </li>
            <li>
              <a href="/permissions" className="flex items-center p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <span className="ml-3">Permissions</span>
              </a>
            </li>
            <li>
              <a href="/policies" className="flex items-center p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <span className="ml-3">Policies</span>
              </a>
            </li>
            <li>
              <a href="/organizations" className="flex items-center p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <span className="ml-3">Organizations</span>
              </a>
            </li>
            <li>
              <a href="/api-keys" className="flex items-center p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <span className="ml-3">API Keys</span>
              </a>
            </li>
            <li>
              <a href="/audit-logs" className="flex items-center p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                <span className="ml-3">Audit Logs</span>
              </a>
            </li>
            <li>
              <button 
                onClick={logout}
                className="w-full flex items-center p-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
              >
                <span className="ml-3">Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="md:ml-64 pt-16 md:pt-16">
        {/* Top navigation bar */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-10 bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-end">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700 hidden md:block">Welcome, {user?.name || user?.email}</span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {user?.roles?.[0]?.name || 'User'}
            </span>
            <Button onClick={logout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </header>
        
        <main className="mt-16 p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default DashboardLayout;