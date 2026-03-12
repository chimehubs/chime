import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Users, Receipt, ArrowDownRight, MessageSquare, Settings } from 'lucide-react';
import { Card } from '../ui/card';
import AdminLayout from './AdminLayout';
import AdminChat from './AdminChat';
import { supabaseDbService, type Transaction } from '../../../services/supabaseDbService';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
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
      const [profiles, transactions, unreadChat] = await Promise.all([
        supabaseDbService.getAllProfiles(),
        supabaseDbService.getAllTransactions(),
        supabaseDbService.getUnreadAdminCount(),
      ]);

      const pendingTransactions = transactions.filter((t: Transaction) => t.status === 'pending').length;
      const pendingDeposits = transactions.filter((t: Transaction) => t.status === 'pending' && t.type === 'credit').length;

      if (!isMounted) return;
      setNotificationCounts({
        chat: unreadChat,
        users: profiles.length,
        transactions: pendingTransactions,
        deposits: pendingDeposits,
      });
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const adminPages = [
    { icon: MessageSquare, label: 'Customer Care', path: null, color: '#8b5cf6', bgColor: '#ede9fe', action: () => setShowChat(true), badge: notificationCounts.chat },
    { icon: Users, label: 'User Management', path: '/admin/users', color: '#6366f1', bgColor: '#eef2ff', badge: notificationCounts.users },
    { icon: Receipt, label: 'Transactions', path: '/admin/transactions', color: '#f59e0b', bgColor: '#fef3c7', badge: notificationCounts.transactions },
    { icon: ArrowDownRight, label: 'Deposits', path: '/admin/deposits', color: '#10b981', bgColor: '#d1fae5', badge: notificationCounts.deposits },
    { icon: Settings, label: 'Settings', path: '/admin/settings', color: '#06b6d4', bgColor: '#cffafe', badge: 0 }
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
              <motion.button
                key={page.label}
                onClick={() => page.action ? page.action() : navigate(page.path!)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                className="relative flex flex-col items-center gap-3 p-5 rounded-xl bg-card border border-border shadow-md hover:border-[#00b388]/20 hover:shadow-lg transition-all"
              >
                {/* Notification Badge */}
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
              </motion.button>
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
      <AdminChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </AdminLayout>
  );
}
