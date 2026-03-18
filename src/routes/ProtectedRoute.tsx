import React from 'react';
import { Navigate } from 'react-router';
import { useAuthContext } from '../context/AuthProvider';
import AccountFreezeGate from '../app/components/security/AccountFreezeGate';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AccountFreezeGate>{children}</AccountFreezeGate>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login?admin=1" replace />;
  if (user?.role !== 'admin') return <Navigate to="/login?admin=1" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
