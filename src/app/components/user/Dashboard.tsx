import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import {
  Eye,
  EyeOff,
  Plus,
  Receipt,
  PiggyBank,
  Sun,
  Moon,
  User,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Home,
  Activity as ActivityIcon,
  UserCircle,
  CreditCard,
  History,
  X,
  Banknote,
  Dice5,
  Gift,
  Landmark
} from 'lucide-react';
import { Card } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import NotificationDropdown from './NotificationDropdown';
import AccountCreationPrompt from './AccountCreationPrompt';
import AccountCreationModal from './AccountCreationModal';
import { OnboardingGuide } from './OnboardingGuide';
import ImageAnnouncementBar from './ImageAnnouncementBar';
import { HEADER_NEWS_SLIDES, PROMOTION_SLIDES } from './announcementSlides';
import TransactionDetailsModal from './TransactionDetailsModal';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService, type Transaction } from '../../../services/supabaseDbService';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import './Dashboard.css';
import { formatCurrency } from '../ui/utils';

function FloatingDashboardIcons({ darkMode }: { darkMode: boolean }) {
  const ornaments = [
    {
      icon: Landmark,
      position: 'left-[-10px] top-28 sm:left-[4%] sm:top-36',
      size: 'w-14 h-14 sm:w-16 sm:h-16',
      color: '#00a37a',
      aura: 'rgba(0, 163, 122, 0.18)',
      delay: 0,
      duration: 16,
    },
    {
      icon: CreditCard,
      position: 'right-[2%] top-36 sm:right-[8%] sm:top-40',
      size: 'w-12 h-12 sm:w-14 sm:h-14',
      color: '#0f766e',
      aura: 'rgba(15, 118, 110, 0.16)',
      delay: 0.4,
      duration: 14,
    },
    {
      icon: Banknote,
      position: 'left-[7%] top-[430px] hidden sm:flex',
      size: 'w-14 h-14',
      color: '#059669',
      aura: 'rgba(5, 150, 105, 0.16)',
      delay: 0.7,
      duration: 18,
    },
    {
      icon: PiggyBank,
      position: 'right-[-12px] top-[520px] sm:right-[5%] sm:top-[540px]',
      size: 'w-14 h-14 sm:w-16 sm:h-16',
      color: '#14b8a6',
      aura: 'rgba(20, 184, 166, 0.16)',
      delay: 1.1,
      duration: 17,
    },
    {
      icon: TrendingUp,
      position: 'left-[18%] top-[720px] hidden lg:flex',
      size: 'w-12 h-12',
      color: '#0ea5a4',
      aura: 'rgba(14, 165, 164, 0.14)',
      delay: 1.5,
      duration: 13,
    },
    {
      icon: Receipt,
      position: 'right-[18%] top-[780px] hidden md:flex',
      size: 'w-12 h-12',
      color: '#10b981',
      aura: 'rgba(16, 185, 129, 0.14)',
      delay: 1.9,
      duration: 15,
    },
    {
      icon: ArrowUpRight,
      position: 'left-[46%] top-[240px] hidden xl:flex',
      size: 'w-11 h-11',
      color: '#34d399',
      aura: 'rgba(52, 211, 153, 0.16)',
      delay: 2.2,
      duration: 12,
    },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      <div
        className={`absolute inset-x-0 top-0 h-[520px] ${
          darkMode
            ? 'bg-[radial-gradient(circle_at_top,rgba(0,179,136,0.14),transparent_42%),radial-gradient(circle_at_top_right,rgba(20,184,166,0.10),transparent_38%)]'
            : 'bg-[radial-gradient(circle_at_top,rgba(0,179,136,0.10),transparent_40%),radial-gradient(circle_at_top_right,rgba(15,118,110,0.08),transparent_34%)]'
        }`}
      />

      {ornaments.map((item, index) => {
        const Icon = item.icon;

        return (
          <motion.div
            key={`${item.position}-${index}`}
            className={`absolute ${item.position}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: darkMode ? [0.22, 0.42, 0.24] : [0.28, 0.54, 0.3],
              scale: [1, 1.04, 1],
              y: [0, -16, 0],
              x: [0, 8, 0],
              rotate: [-6, 6, -6],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div
              className={`relative ${item.size} rounded-[28px] border backdrop-blur-xl flex items-center justify-center`}
              style={{
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(13,17,23,0.78), rgba(7,41,34,0.44))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(226,247,239,0.92))',
                borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)',
                boxShadow: `0 18px 40px ${item.aura}`,
              }}
            >
              <div
                className="absolute inset-[1px] rounded-[26px]"
                style={{
                  background: darkMode
                    ? 'radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(255,255,255,0) 66%)'
                    : 'radial-gradient(circle at top, rgba(255,255,255,0.88), rgba(255,255,255,0) 68%)',
                }}
              />
              <Icon className="relative z-10 w-6 h-6 sm:w-7 sm:h-7" style={{ color: item.color }} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function FloatingDashboardSticker({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 },
        y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="fixed bottom-24 right-4 z-[15] sm:bottom-8 sm:right-8"
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/85"
          aria-label="Close sticker"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => window.open('https://chime.zendesk.com/hc/en-us', '_blank', 'noopener,noreferrer')}
          className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 shadow-[0_18px_50px_rgba(0,163,122,0.24)] backdrop-blur-xl"
          aria-label="Open Chimehubs help"
          title="Open Chimehubs help"
        >
          <img
            src="https://chime.zendesk.com/hc/theming_assets/01J5RDG4PRMGADPYEQGNVCJ6QA"
            alt="Chimehubs support sticker"
            className="h-[88px] w-[88px] object-contain sm:h-[108px] sm:w-[108px]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout, user, updateUser } = useAuthContext();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAccountCreationPrompt, setShowAccountCreationPrompt] = useState(false);
  const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
  
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [balance, setBalance] = useState(0);
  const [currentView, setCurrentView] = useState('home');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [chatMessageCount, setChatMessageCount] = useState(0);
  const [userAccounts, setUserAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [spendingChartData, setSpendingChartData] = useState<{ name: string; amount: number }[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [spendingThisWeek, setSpendingThisWeek] = useState(0);
  const [spendingLastWeek, setSpendingLastWeek] = useState(0);
  const [incomeThisWeek, setIncomeThisWeek] = useState(0);
  const [expensesThisWeek, setExpensesThisWeek] = useState(0);
  const [greeting, setGreeting] = useState('Welcome');
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [showDashboardSticker, setShowDashboardSticker] = useState(true);

  useEffect(() => {
    const computeGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 17) return 'Good afternoon';
      if (hour < 21) return 'Good evening';
      return 'Good night';
    };
    setGreeting(computeGreeting());
    const interval = setInterval(() => setGreeting(computeGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.role === 'user' && user.status === 'UNREGISTERED') {
      setShowAccountCreationPrompt(true);
      setShowAccountCreationModal(false);
      return;
    }
    if (user?.role === 'user') {
      setShowAccountCreationPrompt(false);
      setShowAccountCreationModal(false);
    }
  }, [user]);

  useEffect(() => {
    const loadProfilePrefs = async () => {
      if (!user?.id) return;
      const profile = await supabaseDbService.getProfile(user.id);
      const preferences = profile?.preferences || user.preferences || {};
      if (profile?.preferences?.darkMode !== undefined) {
        setDarkMode(!!profile.preferences.darkMode);
      }
      const savingsGoals = Array.isArray(preferences.savingsGoals) ? preferences.savingsGoals : [];
      setSavingsBalance(
        savingsGoals.reduce((total: number, goal: { current?: number }) => total + Number(goal?.current || 0), 0),
      );
      const status = (profile?.status || user?.status || '').toString().toUpperCase();
      const onboardingSessionKey = `onboarding_seen_${user.id}`;
      if (status === 'ACTIVE' && preferences.onboardingSeen !== true && sessionStorage.getItem(onboardingSessionKey) !== 'true') {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
      if (profile) {
        updateUser({
          name: profile.name || user.name,
          avatar: profile.avatar_url || user.avatar,
          currency: profile.currency || user.currency,
          status: (profile.status as any) || user.status,
          preferences,
        });
      }
    };
    loadProfilePrefs();
  }, [user?.id, user?.status]);

  useEffect(() => {
    const storageKey = `dashboard_sticker_closed_${user?.id || 'guest'}`;
    setShowDashboardSticker(localStorage.getItem(storageKey) !== 'true');
  }, [user?.id]);

  // Handle "Create Account" button click on the prompt
  const handleStartAccountCreation = () => {
    setShowAccountCreationPrompt(false);
    setShowAccountCreationModal(true);
  };
  useEffect(() => {
    if (user?.id) {
      supabaseDbService.getAccounts(user.id).then(setUserAccounts);
    }
  }, [user?.id, user?.status]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.id || user.status !== 'ACTIVE') {
        setTransactions([]);
        return;
      }
      const items = await supabaseDbService.getTransactions(user.id, 200);
      const sorted = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setTransactions(sorted);
    };
    loadTransactions();
  }, [user?.id, user?.status]);

  useEffect(() => {
    const updateCounts = async () => {
      if (!user?.id) return;
      const unread = await supabaseDbService.getUnreadUserChatCount(user.id);
      setChatMessageCount(unread);
    };

    updateCounts();
    const interval = setInterval(updateCounts, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

  const handleHandleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCloseDashboardSticker = () => {
    const storageKey = `dashboard_sticker_closed_${user?.id || 'guest'}`;
    localStorage.setItem(storageKey, 'true');
    setShowDashboardSticker(false);
  };


  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if (user?.id) {
      sessionStorage.setItem(`onboarding_seen_${user.id}`, 'true');
      supabaseDbService.updateProfile(user.id, {
        preferences: { ...(user.preferences || {}), onboardingSeen: true }
      });
      updateUser({
        preferences: { ...(user.preferences || {}), onboardingSeen: true },
      });
    }
  };

  // Mark all chat messages as read and navigate to chat
  const handleNavigateToChat = () => {
    // Navigate to chat
    navigate('/chat', { state: { from: '/dashboard' } });
  };

  // Toggle dark mode (only for dashboard)
  const handleToggleDarkMode = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (user?.id) {
      await supabaseDbService.updateProfile(user.id, {
        preferences: { ...(user.preferences || {}), darkMode: newDarkMode }
      });
      updateUser({
        preferences: { ...(user.preferences || {}), darkMode: newDarkMode },
      });
    }
  };

  // Fetch real account balance from database
  useEffect(() => {
    if (!user?.id) return;
    const completedTransactions = transactions.filter((tx) => tx.status === 'completed');
    const targetBalance = completedTransactions.reduce((total, tx) => {
      const amount = Number(tx.amount || 0);
      return tx.type === 'credit' ? total + amount : total - amount;
    }, 0);

    let start = 0;
    const duration = 1000;
    const increment = targetBalance > 0 ? targetBalance / (duration / 16) : 0;

    const timer = setInterval(() => {
      start += increment;
      if (start >= targetBalance) {
        setBalance(targetBalance);
        clearInterval(timer);
      } else {
        setBalance(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [user?.id, transactions]);

  // Calculate spending, income, and chart data from transactions
  useEffect(() => {
    if (user?.id) {
      const now = new Date();
      const thisWeekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
      const lastWeekStart = new Date(thisWeekStart.getTime() - (7 * 24 * 60 * 60 * 1000));
      const lastWeekEnd = thisWeekStart;

      let thisWeekIncome = 0;
      let thisWeekExpenses = 0;
      let lastWeekSpending = 0;
      const allTransactions: Transaction[] = transactions.filter((tx) => tx.status === 'completed');

      // Weekly calculations
      allTransactions.forEach((tx) => {
        const txDate = new Date(tx.created_at || 0);
        if (txDate >= thisWeekStart) {
          if (tx.type === 'credit' || Number(tx.amount) > 0) {
            thisWeekIncome += Math.abs(tx.amount || 0);
          } else {
            thisWeekExpenses += Math.abs(tx.amount || 0);
          }
        } else if (txDate >= lastWeekStart && txDate < lastWeekEnd) {
          if (tx.type === 'debit' || Number(tx.amount) < 0) {
            lastWeekSpending += Math.abs(tx.amount || 0);
          }
        }
      });

      setSpendingThisWeek(thisWeekExpenses);
      setSpendingLastWeek(lastWeekSpending);
      setIncomeThisWeek(thisWeekIncome);
      setExpensesThisWeek(thisWeekExpenses);

      // Spending chart (last 7 days, debit only)
      const dayBuckets: { key: string; name: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const name = d.toLocaleDateString('en-US', { weekday: 'short' });
        dayBuckets.push({ key, name, amount: 0 });
      }

      allTransactions.forEach((tx) => {
        const txDate = new Date(tx.created_at || 0);
        const key = txDate.toISOString().slice(0, 10);
        const bucket = dayBuckets.find(b => b.key === key);
        if (!bucket) return;
        if (tx.type === 'debit' || Number(tx.amount) < 0) {
          bucket.amount += Math.abs(tx.amount || 0);
        }
      });

      setSpendingChartData(dayBuckets.map(({ name, amount }) => ({ name, amount })));
    } else {
      setTransactions([]);
      setSpendingChartData([]);
    }
  }, [user?.id, user?.status, transactions]);

  const formatBalance = (value: number) => {
    const code = user?.currency || 'USD';
    const formatted = formatCurrency(value, code);
    return code === 'USD' ? formatted.replace(/^US\$/, '$') : formatted;
  };

  const renderContent = () => {
    if (currentView === 'home') {
      return (
        <div className="px-6 pb-44 md:pb-28 space-y-6">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            data-tour="balance"
          >
            <Card className="relative overflow-hidden border border-white/15 bg-white/10 p-6 shadow-[0_24px_60px_rgba(0,122,98,0.22)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,179,136,0.86),rgba(0,126,103,0.78)_58%,rgba(10,42,36,0.62))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_32%)]" />
              <div className="absolute inset-[1px] rounded-[inherit] border border-white/8" />
              <div className="relative z-10">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-white/85 text-sm mb-1">Available Balance {userAccounts.length > 0 ? `(${userAccounts[0]?.account_number})` : ''}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {balanceVisible ? (
                      <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-3xl sm:text-4xl text-white tracking-tight font-semibold tabular-nums break-all"
                      >
                        {formatBalance(balance)}
                      </motion.h2>
                    ) : (
                      <h2 className="text-3xl sm:text-4xl text-white/90 tracking-tight font-semibold">
                        ******
                      </h2>
                    )}
                    <button
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      title={balanceVisible ? 'Hide balance' : 'Show balance'}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      {balanceVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setShowHistoryModal(true)}
                    title="View transaction history"
                    className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors shadow-sm hover:shadow-md"
                  >
                    <History className="w-5 h-5 text-white" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

                <div className="flex items-center gap-2 text-white/85 text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+12.5% this month</span>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(2,84,63,0.92),rgba(4,120,87,0.8))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(1,64,46,0.22)] flex items-center justify-between gap-3 text-white/90 text-sm">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" />
                    <span>Savings Balance</span>
                  </div>
                  <span className="font-semibold text-white">
                    {balanceVisible ? formatBalance(savingsBalance) : '******'}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Header News */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
          >
            <ImageAnnouncementBar items={HEADER_NEWS_SLIDES} className="h-[92px]" />
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            data-tour="quick-actions"
          >
            <h3 className={`text-sm mb-4 font-medium ${darkMode ? 'text-[#8b949e]' : 'text-[#5f7a72]'}`}>Quick Actions</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Plus, label: 'Add', color: '#047857', bgColor: '#d9fbef', cardGradient: 'linear-gradient(145deg, rgba(236, 253, 245, 1), rgba(167, 243, 208, 0.72))', darkGradient: 'linear-gradient(145deg, rgba(7, 47, 38, 0.98), rgba(8, 78, 61, 0.92))', path: '/add-money', soon: false },
                { icon: ArrowDownRight, label: 'Withdraw', color: '#0f766e', bgColor: '#dbfbf8', cardGradient: 'linear-gradient(145deg, rgba(240, 253, 250, 1), rgba(153, 246, 228, 0.72))', darkGradient: 'linear-gradient(145deg, rgba(9, 41, 42, 0.98), rgba(15, 87, 85, 0.92))', path: '/dashboard/withdraw', soon: false },
                { icon: CreditCard, label: 'Cards', color: '#0369a1', bgColor: '#e0f5ff', cardGradient: 'linear-gradient(145deg, rgba(239, 248, 255, 1), rgba(125, 211, 252, 0.7))', darkGradient: 'linear-gradient(145deg, rgba(11, 32, 52, 0.98), rgba(10, 74, 108, 0.92))', path: '/dashboard/cards', soon: false },
                { icon: PiggyBank, label: 'Save', color: '#166534', bgColor: '#e3f8e6', cardGradient: 'linear-gradient(145deg, rgba(240, 253, 244, 1), rgba(134, 239, 172, 0.72))', darkGradient: 'linear-gradient(145deg, rgba(12, 38, 22, 0.98), rgba(22, 101, 52, 0.92))', path: '/savings', soon: false },
                { icon: Banknote, label: 'Pay Bills', color: '#065f46', bgColor: '#dbfce7', cardGradient: 'linear-gradient(145deg, rgba(236, 253, 245, 1), rgba(110, 231, 183, 0.72))', darkGradient: 'linear-gradient(145deg, rgba(8, 39, 28, 0.98), rgba(6, 95, 70, 0.92))', path: '/dashboard/pay-bills', soon: false },
                { icon: Dice5, label: 'Betting', color: '#0f766e', bgColor: '#dcfdf7', cardGradient: 'linear-gradient(145deg, rgba(240, 253, 250, 1), rgba(94, 234, 212, 0.72))', darkGradient: 'linear-gradient(145deg, rgba(8, 35, 38, 0.98), rgba(13, 104, 111, 0.92))', path: '/dashboard/betting', soon: false },
                { icon: Gift, label: 'Cashback', color: '#047857', bgColor: '#d1fae5', cardGradient: 'linear-gradient(145deg, rgba(236, 253, 245, 1), rgba(52, 211, 153, 0.72))', darkGradient: 'linear-gradient(145deg, rgba(8, 42, 33, 0.98), rgba(4, 120, 87, 0.92))', path: '/dashboard/cashback', soon: false },
                { icon: Landmark, label: 'Loan', color: '#0f766e', bgColor: '#d5fbf5', cardGradient: 'linear-gradient(145deg, rgba(240, 253, 250, 1), rgba(45, 212, 191, 0.72))', darkGradient: 'linear-gradient(145deg, rgba(7, 36, 39, 0.98), rgba(15, 118, 110, 0.92))', path: '/dashboard/loan', soon: false }
              ].map((action, index) => (
                <motion.button
                  key={action.label}
                  onClick={() => action.path && navigate(action.path)}
                  disabled={action.soon}
                  whileHover={{ scale: action.soon ? 1 : 1.05, y: action.soon ? 0 : -2 }}
                  whileTap={{ scale: action.soon ? 1 : 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border shadow-sm transition-all ${
                    darkMode
                      ? 'border-[#21262d] text-[#e8eaed]'
                      : 'border-[#d7ebe4]'
                  } ${
                    action.soon 
                      ? 'opacity-60 cursor-not-allowed' 
                      : 'hover:border-[#9ddfcb] hover:shadow-md'
                  }`}
                  style={{
                    background: darkMode ? action.darkGradient : action.cardGradient,
                    boxShadow: darkMode
                      ? '0 10px 24px rgba(0,0,0,0.24)'
                      : '0 10px 22px rgba(15, 118, 110, 0.10)',
                  }}
                >
                  {/* SOON Badge */}
                  {action.soon && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 + index * 0.05 + 0.2 }}
                      className="absolute -top-2 -right-2 bg-slate-700 text-white/90 text-xs font-semibold px-2 py-1 rounded-full shadow-lg"
                    >
                      SOON
                    </motion.div>
                  )}
                  
                  <motion.div
                    whileHover={action.soon ? {} : { rotate: 5, scale: 1.1 }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                    style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : action.bgColor }}
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                  >
                    <motion.div animate={action.soon ? {} : { rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                      <action.icon className="w-5 h-5" style={{ color: action.color }} />
                    </motion.div>
                  </motion.div>
                  <span className={`text-xs font-medium ${darkMode ? 'text-[#e8eaed]' : 'text-[#1f3b36]'}`}>{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Pending Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {(() => {
              const pendingTx = transactions.filter((tx) => tx.status === 'pending');
              if (pendingTx.length === 0) return null;

              return (
                <div className="mb-6">
                  <h3 className={`text-sm mb-4 font-medium ${darkMode ? 'text-[#8b949e]' : 'text-[#5f7a72]'}`}>Pending Transactions</h3>
                  <div className="space-y-3 max-h-[206px] overflow-y-auto pr-1 md:max-h-none md:overflow-visible">
                    {pendingTx.map((tx) => (
                      <Card
                        key={tx.id}
                        className={`p-4 border-l-4 border-l-[#00b388] hover:shadow-md transition-all cursor-pointer ${
                          darkMode ? 'bg-[#161b22] border-[#21262d] hover:bg-[#1f2937]' : 'hover:bg-[#f2faf7]'
                        }`}
                        onClick={() => navigate('/activity')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-[#0f2e2a]' : 'bg-[#e9f8f3]'}`}>
                                {tx.type === 'credit' ? <Plus className="w-5 h-5 text-[#00a37a]" /> : <ArrowDownRight className="w-5 h-5 text-[#00a37a]" />}
                              </div>
                              <div>
                                <p className="font-medium capitalize">{tx.type === 'credit' ? 'Add Money' : 'Withdraw'} - Pending</p>
                                <p className="text-xs text-muted-foreground">{tx.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">{formatCurrency(Math.abs(Number(tx.amount)), tx.currency || user?.currency || 'USD')}</p>
                            <p className="text-xs text-muted-foreground capitalize">{tx.type === 'credit' ? 'funding' : 'withdrawal'}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className={`text-sm mb-4 font-medium ${darkMode ? 'text-[#8b949e]' : 'text-[#5f7a72]'}`}>Spending Insights</h3>
            <Card className={`p-6 shadow-sm hover:shadow-md transition-shadow ${darkMode ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border border-[#d7ebe4]'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">This Week</p>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-3xl mt-2 font-semibold text-foreground"
                  >
                    ${spendingThisWeek.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </motion.p>
                </div>
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-right"
                >
                  {spendingLastWeek > 0 ? (
                    <>
                      <div className={`flex items-center gap-1 text-sm mb-2 px-3 py-1 rounded-full w-fit ml-auto ${
                        darkMode ? 'bg-[#0f2e2a] text-[#7ee4bf]' : 'bg-[#e9f8f3] text-[#047857]'
                      }`}>
                        {spendingThisWeek < spendingLastWeek ? (
                          <><ArrowDownRight className="w-4 h-4" /><span className="font-semibold">{Math.round(((spendingLastWeek - spendingThisWeek) / spendingLastWeek) * 100)}% less</span></>
                        ) : (
                          <><ArrowUpRight className="w-4 h-4" /><span className="font-semibold">{Math.round(((spendingThisWeek - spendingLastWeek) / spendingLastWeek) * 100)}% more</span></>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">vs last week</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No data from last week</p>
                  )}
                </motion.div>
              </div>
              
              <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-[#0d1117] border border-[#21262d]' : 'bg-[#f6fbf9] border border-[#d7ebe4]'}`} data-tour="spending-chart">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={spendingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke={darkMode ? '#94a3b8' : '#475569'}
                      tick={{ fill: darkMode ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 500 }}
                    />
                    <YAxis 
                      stroke={darkMode ? '#94a3b8' : '#475569'}
                      tick={{ fill: darkMode ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 500 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#00b388"
                      strokeWidth={3}
                      dot={{ fill: '#00b388', r: 5 }}
                      activeDot={{ r: 7, fill: '#00a99d' }}
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div 
                  whileHover={{ scale: 1.03 }}
                  className={`p-4 rounded-lg shadow-sm ${darkMode ? 'bg-[#0d1117] border border-[#21262d]' : 'bg-[#f8fcfa] border border-[#d7ebe4]'}`}
                >
                  <div className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Income
                  </div>
                  <p className="text-2xl font-semibold text-foreground">${incomeThisWeek.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.03 }}
                  className={`p-4 rounded-lg shadow-sm ${darkMode ? 'bg-[#0d1117] border border-[#21262d]' : 'bg-[#f8fcfa] border border-[#d7ebe4]'}`}
                >
                  <div className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                    Expenses
                  </div>
                  <p className="text-2xl font-semibold text-foreground">${expensesThisWeek.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* Promotions */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24 }}
          >
            <ImageAnnouncementBar items={PROMOTION_SLIDES} className="h-[92px]" />
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-[#8b949e]' : 'text-muted-foreground'}`}>Recent Activity</h3>
              <button
                onClick={() => setCurrentView('activity')}
                className="text-sm text-[#00b388] hover:text-[#009670] transition-colors font-medium"
              >
                View All
              </button>
            </div>
            <Card className={`shadow-sm hover:shadow-md transition-shadow overflow-y-auto max-h-[360px] ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`} data-tour="recent-transactions">
              {transactions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p>Your recent transactions will appear here once your account is active.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedTransaction(tx)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''} {tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : ''}
                        </p>
                      </div>
                      <div className={`text-sm font-semibold tabular-nums ${tx.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                        {tx.type === 'debit' ? '-' : '+'}{formatCurrency(Math.abs(Number(tx.amount)), tx.currency || user?.currency || 'USD')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      );
    } else if (currentView === 'activity') {
      return (
        <div className="px-6 pb-44 md:pb-28 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl mb-6 font-semibold">All Transactions</h2>
            <Card className={`divide-y divide-border max-h-[65vh] overflow-y-auto ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              {transactions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No transactions yet.</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''} {tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : ''}
                      </p>
                    </div>
                    <div className={`text-sm font-semibold tabular-nums ${tx.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.type === 'debit' ? '-' : '+'}{formatCurrency(Math.abs(Number(tx.amount)), tx.currency || user?.currency || 'USD')}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </motion.div>
        </div>
      );
    } else if (currentView === 'profile') {
      return (
        <div className="px-6 pb-44 md:pb-28 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-[#e9f8f3] flex items-center justify-center">
                <User className="w-10 h-10 text-[#00a37a]" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">John Anderson</h2>
                <p className="text-sm text-muted-foreground">john.anderson@email.com</p>
              </div>
            </div>

            <Card className="divide-y divide-border">
              {[
                { label: 'Account Settings', icon: User },
                { label: 'Security', icon: Eye },
                { label: 'Customer Care', icon: MessageCircle, action: () => navigate('/chat', { state: { from: '/dashboard' } }) },
                { label: 'Support', icon: Receipt }
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                  onClick={() => item.action?.()}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </Card>
          </motion.div>
        </div>
      );
    }
  };

  return (
    <div className={`dashboard-container relative isolate overflow-hidden min-h-screen transition-colors ${darkMode ? 'dark' : ''} ${darkMode ? 'text-white' : 'bg-[#f2f5f3] text-[#0f1720]'}`}>
      {currentView === 'home' && <FloatingDashboardIcons darkMode={darkMode} />}
      {currentView === 'home' && (
        <FloatingDashboardSticker
          visible={showDashboardSticker}
          onClose={handleCloseDashboardSticker}
        />
      )}
      {/* NotificationDropdown removed from under header bar */}
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`sticky top-0 z-10 ${darkMode ? 'bg-[#0d1117]/80 border-b border-[#21262d]' : 'bg-[#f2f5f3]/95 border-b border-[#dbe7e2]'} backdrop-blur-lg px-6 py-4`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${darkMode ? 'text-[#8b949e]' : 'text-[#5f7a72]'}`}>{greeting},</p>
            <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-[#0f1720]'} truncate hidden sm:block`}>
              {(user?.status || '').toString().toUpperCase() === 'ACTIVE' ? (user?.name?.split(' ')[0] || 'User') : 'User'}
            </h1>
            <h1 className={`text-lng font-semibold ${darkMode ? 'text-white' : 'text-[#0f1720]'} truncate sm:hidden`}>
              {(user?.status || '').toString().toUpperCase() === 'ACTIVE' ? (user?.name?.split(' ')[0] || 'User') : 'User'}
            </h1>
          </div>
          <div className="flex items-center gap-3" data-tour="header-icons">
            {/* Chat Icon */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm hover:shadow-md ${darkMode ? 'bg-[#161b22]' : 'bg-white border border-[#dbe7e2]'}`}
              
              title="Customer Care Chat"
              onClick={handleNavigateToChat}
            >
              <MessageCircle className="w-5 h-5 text-[#00a37a]" />
              {chatMessageCount > 0 && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-xs text-white font-semibold">{chatMessageCount > 9 ? '9+' : chatMessageCount}</span>
                </motion.div>
              )}
            </motion.button>
            {/* Notification Bell Icon */}
            <NotificationDropdown userId={user?.id} />
            {/* Dark Mode Toggle */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.3 }}
              onClick={handleToggleDarkMode}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm hover:shadow-md ${darkMode ? 'bg-[#161b22]' : 'bg-white border border-[#dbe7e2]'}`}
              
              title="Toggle dark mode"
            >
              {darkMode ? (
                <Moon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Sun className="w-5 h-5 text-muted-foreground" />
              )}
            </motion.button>
            {/* Profile Icon */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
              onClick={() => navigate('/profile')}
              className="relative rounded-full transition-transform shadow-sm hover:shadow-md"
              title="Profile"
            >
              <Avatar className="w-10 h-10 border-2 border-[#dbe7e2] hover:border-[#9ddfcb]">
                <AvatarImage 
                  src={user?.avatar}
                  alt={user?.name} 
                />
                <AvatarFallback className="bg-[#00a37a] text-white font-semibold">
                  {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </motion.button>
            {/* Logout button removed as requested */}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-[1] pt-6">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`fixed bottom-0 left-0 right-0 z-20 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-[#dbe7e2]'} border-t px-6 py-4 md:hidden`}
      >
        <div className="flex items-center justify-around">
          {[
            { icon: Home, label: 'Home', action: () => setCurrentView('home'), nav: false, color: '#00a37a', bgColor: '#e9f8f3' },
            { icon: ActivityIcon, label: 'Activity', action: () => setCurrentView('activity'), nav: false, color: '#00a37a', bgColor: '#e9f8f3' },
            { icon: PiggyBank, label: 'Savings', action: () => navigate('/savings'), nav: true, color: '#00a37a', bgColor: '#e9f8f3' },
            { icon: UserCircle, label: 'Profile', action: () => navigate('/profile'), nav: true, color: '#00a37a', bgColor: '#e9f8f3' }
          ].map((item, index) => (
            <motion.button
              key={item.label}
              onClick={item.action}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.3 }}
              className="flex flex-col items-center gap-1 transition-colors p-2 rounded-lg shadow-sm hover:shadow-md"
            >
              <motion.div
                style={{ backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : item.bgColor }}
                className="w-10 h-10 rounded-lg flex items-center justify-center"
              >
                <motion.div whileHover={{ rotate: 10, scale: 1.15 }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </motion.div>
              </motion.div>
              <span className={`text-xs font-medium ${darkMode ? 'text-[#e8eaed]' : 'text-[#1f3b36]'}`}>{item.label}</span>
            </motion.button>
          ))}
          {/* Cards Navigation Button */}
          <motion.button
            onClick={() => navigate('/dashboard/cards')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1.2 }}
            className="flex flex-col items-center gap-1 transition-colors cursor-pointer p-2 rounded-lg shadow-sm hover:shadow-md"
          >
            <motion.div
              style={{ backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : '#e9f8f3' }}
              className="w-10 h-10 rounded-lg flex items-center justify-center"
            >
              <motion.div whileHover={{ rotate: 10, scale: 1.15 }}>
                <CreditCard className="w-5 h-5" style={{ color: '#00a37a' }} />
              </motion.div>
            </motion.div>
            <span className={`text-xs font-medium ${darkMode ? 'text-[#e8eaed]' : 'text-[#1f3b36]'}`}>Cards</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Account Creation Prompt - Show initial prompt card awaiting user to click "Create Account" */}
      {showAccountCreationPrompt && (
        <AccountCreationPrompt
          isOpen={showAccountCreationPrompt}
          onClose={() => setShowAccountCreationPrompt(false)}
          onStartCreation={handleStartAccountCreation}
        />
      )}

      {/* Account Creation Modal */}
      <AccountCreationModal
        isOpen={showAccountCreationModal}
        onClose={() => setShowAccountCreationModal(false)}
        onSuccess={() => {
          setShowAccountCreationModal(false);
          setShowAccountCreationPrompt(false);
          // Refresh dashboard data after account creation
          if (user?.id) {
            supabaseDbService.getAccounts(user.id).then(setUserAccounts);
            supabaseDbService.getTransactions(user.id, 200).then((items) => {
              const sorted = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
              setTransactions(sorted);
            });
          }
        }}
      />

      {/* Onboarding Guide - Show after account activation */}
      <OnboardingGuide 
        isOpen={showOnboarding} 
        onComplete={handleOnboardingComplete} 
        userName={user?.name || 'User'} 
      />

      {/* Transaction History Modal */}
      {showHistoryModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowHistoryModal(false)}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                title="Close modal"
                className="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-border">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground text-sm">No transactions yet</p>
                  </div>
                ) : (
                  transactions.map((transaction: any, index: number) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 flex items-center gap-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg flex-shrink-0">
                        {transaction.type === 'debit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : ''} {transaction.created_at ? new Date(transaction.created_at).toLocaleTimeString() : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold tabular-nums ${transaction.type === 'debit' ? 'text-foreground' : 'text-green-600'}`}
                        >
                          {transaction.type === 'debit' ? '-' : '+'}{formatCurrency(Math.abs(Number(transaction.amount)), transaction.currency || user?.currency || 'USD')}
                        </p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-muted-foreground">Completed</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border p-4 bg-muted/50">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-4 py-2 bg-muted text-foreground border border-border rounded-lg hover:bg-muted/70 transition-colors font-medium text-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}


      <TransactionDetailsModal
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        fallbackCurrency={user?.currency || 'USD'}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}



