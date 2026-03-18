import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownLeft, Activity as ActivityIcon, LogOut, Home } from 'lucide-react';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService, type Transaction } from '../../../services/supabaseDbService';
import AccountCreationPrompt from './AccountCreationPrompt';
import AccountCreationModal from './AccountCreationModal';
import TransactionDetailsModal from './TransactionDetailsModal';
import ImageAnnouncementBar from './ImageAnnouncementBar';
import { FLOW_ANNOUNCEMENT_SLIDES } from './announcementSlides';

export default function Activity() {
  const navigate = useNavigate();
  const { logout, user } = useAuthContext();
  const [darkMode, setDarkMode] = useState(false);
  const [showAccountCreationPrompt, setShowAccountCreationPrompt] = useState(false);
  const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user needs to create account
  useEffect(() => {
    if (user?.status === 'UNREGISTERED') {
      setShowAccountCreationPrompt(true);
    } else {
      setShowAccountCreationPrompt(false);
      setShowAccountCreationModal(false);
    }
  }, [user?.status]);

  // Load transactions on mount
  useEffect(() => {
    loadTransactions();
  }, [user?.id, user?.status]);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      const profile = await supabaseDbService.getProfile(user.id);
      if (profile?.preferences?.darkMode !== undefined) {
        setDarkMode(!!profile.preferences.darkMode);
      }
    };
    loadPreferences();
  }, [user?.id]);

  const loadTransactions = async () => {
    if (!user?.id || user.status !== 'ACTIVE') {
      setLoading(false);
      return;
    }

    const items = await supabaseDbService.getTransactions(user.id, 200);
    const sorted = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    setTransactions(sorted);
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <ActivityIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Please Login</h2>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to view activity.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-[#00b388] text-white rounded-lg font-semibold hover:bg-[#009670] transition-colors shadow-md hover:shadow-lg"
          >
            Back to Login
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-[#0d1117] text-white' : 'bg-background'}`}>
      <AccountCreationPrompt
        isOpen={showAccountCreationPrompt}
        onClose={() => setShowAccountCreationPrompt(false)}
        onStartCreation={() => {
          setShowAccountCreationPrompt(false);
          setShowAccountCreationModal(true);
        }}
      />
      <AccountCreationModal
        isOpen={showAccountCreationModal}
        onClose={() => setShowAccountCreationModal(false)}
        onSuccess={() => {
          setShowAccountCreationModal(false);
          setShowAccountCreationPrompt(false);
          loadTransactions();
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`sticky top-0 z-10 ${darkMode ? 'bg-[#0d1117]/80 border-b border-[#21262d]' : 'bg-background/80 border-b border-border'} backdrop-blur-lg px-6 py-4`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ color: '#06b6d4' }}
              >
                <ActivityIcon className="w-6 h-6" />
              </motion.div>
              Activity
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Your transaction history</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-[#21262d] text-gray-300 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>

      {/* Transactions List */}
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <ImageAnnouncementBar items={FLOW_ANNOUNCEMENT_SLIDES} className="h-[92px]" />
        </div>
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground"
          >
            <span>Loading transactions...</span>
          </motion.div>
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center py-12 ${
              darkMode ? 'bg-[#0d1117]' : 'bg-background/50'
            } rounded-lg`}
          >
            <ActivityIcon className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Your transaction history will appear here
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-[#161b22] border-[#21262d] hover:border-[#30363d]'
                    : 'bg-white border-border hover:border-gray-300'
                } cursor-pointer`}
                onClick={() => setSelectedTransaction(transaction)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={`p-2 rounded-lg ${
                        transaction.type === 'debit'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-green-500/10 text-green-600'
                      }`}
                    >
                      {transaction.type === 'debit' ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5" />
                      )}
                    </motion.div>
                    <div>
                      <p className="font-semibold capitalize">{transaction.description}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : ''}{' '}
                        {transaction.created_at ? new Date(transaction.created_at).toLocaleTimeString() : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'debit'
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}>
                      {transaction.type === 'debit' ? '-' : '+'}
                      ${Number(transaction.amount).toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      darkMode ? 'text-gray-500' : 'text-gray-600'
                    }`}>
                      {transaction.currency || user?.currency || 'USD'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Home Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/dashboard')}
        className="fixed bottom-6 right-6 p-4 bg-[#00b388] text-white rounded-full shadow-lg hover:shadow-xl hover:bg-[#009670] transition-all"
        title="Back to Dashboard"
      >
        <Home className="w-6 h-6" />
      </motion.button>

      <TransactionDetailsModal
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        fallbackCurrency={user?.currency || 'USD'}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
