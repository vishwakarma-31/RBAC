import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Roles } from './pages/Roles';
import { Permissions } from './pages/Permissions';
import { Policies } from './pages/Policies';
import { AuditLogs } from './pages/AuditLogs';
import { Organizations } from './pages/Organizations';
import { ApiKeys } from './pages/ApiKeys';
import { Settings } from './pages/Settings';
import { UserLogin } from './pages/Auth/UserLogin';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UserRegister } from './pages/Auth/UserRegister';
import { AdminLogin } from './pages/Auth/AdminLogin';
import { AdminRegister } from './pages/Auth/AdminRegister';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

export const App: React.FC = () => {
  return (
    <DataProvider>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes - Full Screen */}
            <Route path="/user-login" element={
              <AuthLayout>
                <UserLogin />
              </AuthLayout>
            } />
            <Route path="/user-register" element={
              <AuthLayout>
                <UserRegister />
              </AuthLayout>
            } />
            <Route path="/admin-login" element={
              <AuthLayout>
                <AdminLogin />
              </AuthLayout>
            } />
            <Route path="/admin-register" element={
              <AuthLayout>
                <AdminRegister />
              </AuthLayout>
            } />
            
            {/* Protected Dashboard Routes */}
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="roles" element={<Roles />} />
              <Route path="permissions" element={<Permissions />} />
              <Route path="policies" element={<Policies />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="organizations" element={<Organizations />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </DataProvider>
  );
};