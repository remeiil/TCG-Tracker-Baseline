import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ requiredPermission, redirectPath = '/login' }) {
  const { token, hasPermission } = useAuth();

  // 1. Not logged in -> Redirect to login
  if (!token) {
    return <Navigate to={redirectPath} replace />;
  }

  // 2. Logged in, but lacks required permission -> Redirect to unauthorized page or home
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  // 3. Authorized -> Render requested route
  return <Outlet />;
}