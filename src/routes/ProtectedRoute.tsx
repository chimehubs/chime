import React from 'react';
import { Navigate } from 'react-router';
import { useAuthContext } from '../context/AuthProvider';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login?admin=1" replace />;
  if (user?.role !== 'admin') return <Navigate to="/login?admin=1" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
