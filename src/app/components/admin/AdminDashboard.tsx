import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, Receipt, ArrowDownRight, MessageSquare, Settings } from 'lucide-react';
import { Card } from '../ui/card';
import AdminLayout from './AdminLayout';
import AdminChat from './AdminChat';
import { supabaseDbService, type Transaction } from '../../../services/supabaseDbService';
import { getClient } from '../../../services/supabaseClient';
import './AdminDashboard.css';

const ADMIN_USERS_VIEWED_AT_KEY = 'admin-dashboard:users-viewed-at';
const ADMIN_TRANSACTIONS_VIEWED_AT_KEY = 'admin-dashboard:transactions-viewed-at';
const ADMIN_DEPOSITS_VIEWED_AT_KEY = 'admin-dashboard:deposits-viewed-at';

function ensureViewedAt(key: string) {
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const now = new Date().toISOString();
  window.localStorage.setItem(key, now);
  return now;
}

function getViewedAtValue(key: string) {
  return new Date(ensureViewedAt(key)).getTime();
}

export default function AdminDashboard() {
  const [showChat, setShowChat] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({
    chat: 0,
    users: 0,
    transactions: 0,
    deposits: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const updateCounts = async () => {
      const usersViewedAt = getViewedAtValue(ADMIN_USERS_VIEWED_AT_KEY);
      const transactionsViewedAt = getViewedAtValue(ADMIN_TRANSACTIONS_VIEWED_AT_KEY);
      const depositsViewedAt = getViewedAtValue(ADMIN_DEPOSITS_VIEWED_AT_KEY);
      const [profiles, transactions, unreadChat] = await Promise.all([
        supabaseDbService.getAllProfiles(),
        supabaseDbService.getAllTransactions(),
        supabaseDbService.getUnreadAdminCount(),
      ]);

      const newUsers = profiles.filter((profile) => {
        if (profile.role === 'admin' || !profile.created_at) return false;
        return new Date(profile.created_at).getTime() > usersViewedAt;
      }).length;
      const pendingTransactions = transactions.filter((t: Transaction) => {
        if (t.status !== 'pending' || !t.created_at) return false;
        return new Date(t.created_at).getTime() > transactionsViewedAt;
      }).length;
      const pendingDeposits = transactions.filter((t: Transaction) => {
        if (t.status !== 'pending' || t.type !== 'credit' || !t.created_at) return false;
        return new Date(t.created_at).getTime() > depositsViewedAt;
      }).length;

      if (!isMounted) return;
      const nextCounts = {
        chat: unreadChat,
        users: newUsers,
        transactions: pendingTransactions,
        deposits: pendingDeposits,
      };

      setNotificationCounts((prev) =>
        prev.chat === nextCounts.chat &&
        prev.users === nextCounts.users &&
        prev.transactions === nextCounts.transactions &&
        prev.deposits === nextCounts.deposits
          ? prev
          : nextCounts
      );
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);
    const client = getClient();
    const channel = client
      ?.channel('admin-dashboard:counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        void updateCounts();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        void updateCounts();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, () => {
        void updateCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        void updateCounts();
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, []);

  const markAdminUsersViewed = () => {
    window.localStorage.setItem(ADMIN_USERS_VIEWED_AT_KEY, new Date().toISOString());
    setNotificationCounts((prev) => ({ ...prev, users: 0 }));
  };

  const markAdminTransactionsViewed = () => {
    const now = new Date().toISOString();
    window.localStorage.setItem(ADMIN_TRANSACTIONS_VIEWED_AT_KEY, now);
    window.localStorage.setItem(ADMIN_DEPOSITS_VIEWED_AT_KEY, now);
    setNotificationCounts((prev) => ({ ...prev, transactions: 0, deposits: 0 }));
  };

  const markAdminDepositsViewed = () => {
    window.localStorage.setItem(ADMIN_DEPOSITS_VIEWED_AT_KEY, new Date().toISOString());
    setNotificationCounts((prev) => ({ ...prev, deposits: 0 }));
  };

  const handleUnreadCountChange = useCallback((count: number) => {
    setNotificationCounts((prev) => (prev.chat === count ? prev : { ...prev, chat: count }));
  }, []);

  const adminPages = [
    { icon: MessageSquare, label: 'Customer Care', path: null, color: '#8b5cf6', bgColor: '#ede9fe', action: () => setShowChat(true), badge: notificationCounts.chat },
    { icon: Users, label: 'User Management', path: '/admin/users', color: '#6366f1', bgColor: '#eef2ff', action: markAdminUsersViewed, badge: notificationCounts.users },
    { icon: Receipt, label: 'Transactions', path: '/admin/transactions', color: '#f59e0b', bgColor: '#fef3c7', action: markAdminTransactionsViewed, badge: notificationCounts.transactions },
    { icon: ArrowDownRight, label: 'Deposits', path: '/admin/deposits', color: '#10b981', bgColor: '#d1fae5', action: markAdminDepositsViewed, badge: notificationCounts.deposits },
    { icon: Settings, label: 'Settings', path: '/admin/settings', color: '#06b6d4', bgColor: '#cffafe', action: undefined, badge: 0 },
  ];

  return (
    <AdminLayout title="Overview" subtitle="Access all admin management tools">
      <div className="space-y-6">
        {/* Admin Pages Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-sm mb-4 text-muted-foreground font-medium">Admin Dashboard Pages</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {adminPages.map((page, index) => (
              <motion.div
                key={page.label}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                className="relative"
              >
                {page.path ? (
                  <Link
                    to={page.path}
                    onClick={page.action}
                    className="relative flex flex-col items-center gap-3 p-5 rounded-xl bg-card border border-border shadow-md hover:border-[#00b388]/20 hover:shadow-lg transition-all"
                  >
                    {page.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg min-w-[24px] text-center"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {page.badge > 99 ? '99+' : page.badge}
                        </motion.div>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                      style={{ backgroundColor: page.bgColor }}
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                    >
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                        <page.icon className="w-6 h-6" style={{ color: page.color }} />
                      </motion.div>
                    </motion.div>
                    <span className="text-sm font-medium text-center leading-tight">{page.label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={page.action}
                    className="relative flex w-full flex-col items-center gap-3 p-5 rounded-xl bg-card border border-border shadow-md hover:border-[#00b388]/20 hover:shadow-lg transition-all"
                  >
                    {page.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg min-w-[24px] text-center"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {page.badge > 99 ? '99+' : page.badge}
                        </motion.div>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                      style={{ backgroundColor: page.bgColor }}
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                    >
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                        <page.icon className="w-6 h-6" style={{ color: page.color }} />
                      </motion.div>
                    </motion.div>
                    <span className="text-sm font-medium text-center leading-tight">{page.label}</span>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-sm mb-4 text-muted-foreground font-medium">System Status</h3>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-green-900">System Online</p>
                <p className="text-xs text-green-700">All services operational • Last checked: Just now</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Admin Chat Modal */}
      <AdminChat
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onUnreadCountChange={handleUnreadCountChange}
      />
    </AdminLayout>
  );
}
