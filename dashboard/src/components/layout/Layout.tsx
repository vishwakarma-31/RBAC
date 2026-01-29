import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthAwareNav } from './AuthAwareNav';
import { 
  HomeIcon, 
  UserGroupIcon, 
  ShieldCheckIcon, 
  KeyIcon, 
  DocumentTextIcon, 
  ClipboardDocumentListIcon, 
  BuildingOfficeIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Users', href: '/users', icon: UserGroupIcon },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon },
  { name: 'Permissions', href: '/permissions', icon: KeyIcon },
  { name: 'Policies', href: '/policies', icon: DocumentTextIcon },
  { name: 'Audit Logs', href: '/audit', icon: ClipboardDocumentListIcon },
  { name: 'Organizations', href: '/organizations', icon: BuildingOfficeIcon },
  { name: 'API Keys', href: '/api-keys', icon: KeyIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { currentOrganization, setCurrentOrganization, refreshAll, organizations } = useData();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load notifications on component mount
  useEffect(() => {
    // In a real implementation, this would fetch notifications from the API
    // For now, we'll initialize with an empty array
    setNotifications([]);
  }, []);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOrg = e.target.value;
    setCurrentOrganization(newOrg);
    // Refresh all data when organization changes
    refreshAll();
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className={`bg-gray-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-4 border-b border-gray-800">
            <div className="flex items-center">
              <div className="bg-primary-600 w-8 h-8 rounded-md flex items-center justify-center">
                <ShieldCheckIcon className="h-5 w-5 text-white" />
              </div>
              {sidebarOpen && (
                <span className="ml-3 text-xl font-bold">RBAC Admin</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-700 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <ChevronDownIcon className={`h-5 w-5 transform ${sidebarOpen ? 'rotate-90' : 'rotate-0'}`} />
              </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-900 capitalize">
                {navigation.find(item => location.pathname === item.href)?.name || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Organization selector */}
              <div className="relative">
                <select 
                  value={currentOrganization}
                  onChange={handleOrgChange}
                  className="bg-white border border-gray-300 rounded-md py-1 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {organizations.map(org => (
                    <option key={org.id} value={org.name}>{org.name}</option>
                  ))}
                </select>
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none relative"
                >
                  <BellIcon className="h-6 w-6" />
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
                </button>
                
                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                          <div 
                            key={index} 
                            className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            onClick={() => {
                              // Handle notification click
                              console.log('Notification clicked:', notification);
                              setNotificationsOpen(false);
                            }}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <div className={`h-2 w-2 rounded-full mt-2 ${notification.severity === 'high' ? 'bg-red-500' : notification.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                <p className="text-sm text-gray-500 mt-1">{notification.description}</p>
                                <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">No notifications</div>
                      )}
                    </div>
                    <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                      <button 
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        onClick={() => {
                          // Handle view all notifications
                          console.log('View all notifications');
                          setNotificationsOpen(false);
                        }}
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

            {/* User menu */}
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={logout}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Not logged in</div>
            )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};