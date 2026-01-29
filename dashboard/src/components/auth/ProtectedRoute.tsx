import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole = 'user' 
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to user login page for all unauthenticated users
    return <Navigate to='/user-login' replace />;
  }

  // Check if user has required role
  const hasRequiredRole = user.roles.some(role => 
    requiredRole === 'admin' ? (role.name === 'admin' || role.name === 'system:admin' || role.name === 'tenant:admin') : true
  );

  if (!hasRequiredRole) {
    // Redirect to appropriate page if user doesn't have required role
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};