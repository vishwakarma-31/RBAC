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
            <Route element={
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute requiredRole="admin"><Users /></ProtectedRoute>} />
                  <Route path="/roles" element={<ProtectedRoute requiredRole="admin"><Roles /></ProtectedRoute>} />
                  <Route path="/permissions" element={<ProtectedRoute requiredRole="admin"><Permissions /></ProtectedRoute>} />
                  <Route path="/policies" element={<ProtectedRoute requiredRole="admin"><Policies /></ProtectedRoute>} />
                  <Route path="/audit" element={<ProtectedRoute requiredRole="admin"><AuditLogs /></ProtectedRoute>} />
                  <Route path="/organizations" element={<ProtectedRoute requiredRole="admin"><Organizations /></ProtectedRoute>} />
                  <Route path="/api-keys" element={<ProtectedRoute requiredRole="admin"><ApiKeys /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                </Routes>
              </DashboardLayout>
            }>
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </DataProvider>
  );
};