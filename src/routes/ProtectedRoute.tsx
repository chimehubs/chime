import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthProvider';
import AccountFreezeGate from '../app/components/security/AccountFreezeGate';
import AdminPinGate from '../app/components/admin/AdminPinGate';
import { isAdminDashboardPinVerified } from '../utils/adminSecurity';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050b0a] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-[#00b388] animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AccountFreezeGate>{children}</AccountFreezeGate>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const [pinVerified, setPinVerified] = React.useState(() => isAdminDashboardPinVerified());

  React.useEffect(() => {
    setPinVerified(isAdminDashboardPinVerified());
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050b0a] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-[#00b388] animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login?admin=1" replace />;
  if (user?.role !== 'admin') return <Navigate to="/login?admin=1" replace />;
  if (!pinVerified) {
    return <AdminPinGate onVerified={() => setPinVerified(true)} />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
