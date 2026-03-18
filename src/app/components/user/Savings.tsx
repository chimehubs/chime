import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Target,
  TrendingUp,
  PiggyBank,
  Gift,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Wallet,
  ArrowDownCircle,
  Scissors,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { formatCurrency } from '../ui/utils';
import AccountCreationPrompt from './AccountCreationPrompt';
import AccountCreationModal from './AccountCreationModal';
import ImageAnnouncementBar from './ImageAnnouncementBar';
import { FLOW_ANNOUNCEMENT_SLIDES } from './announcementSlides';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService, type Transaction } from '../../../services/supabaseDbService';
import { calculateCompletedBalance } from './userAccountState';

interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  category: string;
  deadline: string;
  color: string;
}

type GoalActionMode = 'fund' | 'withdraw';

export default function Savings() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [showAccountCreationPrompt, setShowAccountCreationPrompt] = useState(false);
  const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [processingGoalId, setProcessingGoalId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.status === 'UNREGISTERED') {
      setShowAccountCreationPrompt(true);
    } else {
      setShowAccountCreationPrompt(false);
      setShowAccountCreationModal(false);
    }
  }, [user?.status]);

  useEffect(() => {
    const loadSavings = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [profile, transactions] = await Promise.all([
        supabaseDbService.getProfile(user.id),
        supabaseDbService.getTransactions(user.id, 500),
      ]);

      const prefs = profile?.preferences || {};
      setProfilePreferences(prefs);
      setDarkMode(Boolean(prefs.darkMode));
      setGoals(Array.isArray(prefs.savingsGoals) ? prefs.savingsGoals : []);
      setAvailableBalance(calculateCompletedBalance(transactions));
      setCurrency(profile?.currency || user.currency || 'USD');
      setLoading(false);
    };

    loadSavings();
  }, [user?.id, user?.currency]);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Other');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedGoalMode, setSelectedGoalMode] = useState<GoalActionMode>('fund');
  const [goalAmountInput, setGoalAmountInput] = useState('');

  const totalSavings = goals.reduce((sum, goal) => sum + goal.current, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const interestEarned = totalSavings * 0.042;
  const overallProgress = totalTarget > 0 ? (totalSavings / totalTarget) * 100 : 0;

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA15E'];

  const formattedAvailableBalance = useMemo(() => {
    const formatted = formatCurrency(availableBalance, currency);
    return currency === 'USD' ? formatted.replace(/^US\$/, '$') : formatted;
  }, [availableBalance, currency]);

  const persistGoals = async (nextGoals: SavingsGoal[]) => {
    if (!user?.id) return;
    const nextPreferences = { ...profilePreferences, savingsGoals: nextGoals };
    setProfilePreferences(nextPreferences);
    setGoals(nextGoals);
    await supabaseDbService.updateProfile(user.id, {
      preferences: nextPreferences,
    });
  };

  const postSavingsTransaction = async (
    transactionType: 'credit' | 'debit',
    goal: SavingsGoal,
    amount: number,
    action: 'fund' | 'withdraw' | 'break',
  ) => {
    if (!user?.id) return false;
    const account = await supabaseDbService.getAccountByUser(user.id);
    if (!account) {
      setError('No active account was found for this savings transfer.');
      return false;
    }

    const descriptionMap = {
      fund: `Savings funding - ${goal.name}`,
      withdraw: `Savings withdrawal - ${goal.name}`,
      break: `Savings break - ${goal.name}`,
    };

    const transaction = await supabaseDbService.createTransaction({
      user_id: user.id,
      account_id: account.id,
      type: transactionType,
      amount: Number(amount.toFixed(2)),
      description: descriptionMap[action],
      currency: account.currency,
      status: 'completed',
      metadata: {
        feature: 'savings',
        action,
        goal_id: goal.id,
        goal_name: goal.name,
        category: goal.category,
      },
    });

    if (!transaction) {
      setError('The savings transfer could not be completed.');
      return false;
    }

    await Promise.all([
      supabaseDbService.createActivity({
        user_id: user.id,
        type: `savings_${action}`,
        description: descriptionMap[action],
        amount: Number(amount.toFixed(2)),
      }),
      supabaseDbService.createNotification({
        user_id: user.id,
        title: action === 'fund' ? 'Savings Funded' : action === 'withdraw' ? 'Savings Withdrawn' : 'Savings Goal Broken',
        message:
          action === 'fund'
            ? `${formatCurrency(amount, account.currency)} moved from your available balance into ${goal.name}.`
            : `${formatCurrency(amount, account.currency)} returned from ${goal.name} to your available balance.`,
        type: 'success',
        read: false,
        path: '/savings',
      }),
    ]);

    return true;
  };

  const handleAddGoal = async () => {
    setError('');
    setNotice('');
    if (!newGoalName || !newGoalTarget || !newGoalDeadline) {
      setError('Please fill in all goal fields.');
      return;
    }

    const goal: SavingsGoal = {
      id: Date.now().toString(),
      name: newGoalName,
      target: parseFloat(newGoalTarget),
      current: 0,
      category: newGoalCategory,
      deadline: newGoalDeadline,
      color: colors[goals.length % colors.length],
    };

    const updatedGoals = [...goals, goal];
    await persistGoals(updatedGoals);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCategory('Other');
    setNewGoalDeadline('');
    setShowAddGoal(false);
    setNotice(`Created savings goal for ${goal.name}.`);
  };

  const handleFundGoal = async (goalId: string) => {
    const amount = parseFloat(goalAmountInput);
    if (!goalAmountInput || Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount to fund this savings goal.');
      return;
    }
    if (amount > availableBalance) {
      setError('The amount exceeds your available balance.');
      return;
    }

    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;

    setProcessingGoalId(goalId);
    setError('');
    setNotice('');

    try {
      const ok = await postSavingsTransaction('debit', goal, amount, 'fund');
      if (!ok) return;

      const updatedGoals = goals.map((item) =>
        item.id === goalId ? { ...item, current: item.current + amount } : item,
      );
      await persistGoals(updatedGoals);
      setAvailableBalance((current) => current - amount);
      setGoalAmountInput('');
      setSelectedGoal(null);
      setNotice(`${formatCurrency(amount, currency).replace(/^US\$/, '$')} moved into ${goal.name}.`);
    } finally {
      setProcessingGoalId(null);
    }
  };

  const handleWithdrawFromGoal = async (goalId: string) => {
    const amount = parseFloat(goalAmountInput);
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;
    if (!goalAmountInput || Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount to withdraw from this goal.');
      return;
    }
    if (amount > goal.current) {
      setError('The amount exceeds the saved balance in this goal.');
      return;
    }

    setProcessingGoalId(goalId);
    setError('');
    setNotice('');

    try {
      const ok = await postSavingsTransaction('credit', goal, amount, 'withdraw');
      if (!ok) return;

      const updatedGoals = goals.map((item) =>
        item.id === goalId ? { ...item, current: Math.max(0, item.current - amount) } : item,
      );
      await persistGoals(updatedGoals);
      setAvailableBalance((current) => current + amount);
      setGoalAmountInput('');
      setSelectedGoal(null);
      setNotice(`${formatCurrency(amount, currency).replace(/^US\$/, '$')} returned to your available balance.`);
    } finally {
      setProcessingGoalId(null);
    }
  };

  const handleBreakGoal = async (goalId: string) => {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;
    if (goal.current <= 0) {
      setError('This goal has no saved balance to break.');
      return;
    }

    setProcessingGoalId(goalId);
    setError('');
    setNotice('');

    try {
      const ok = await postSavingsTransaction('credit', goal, goal.current, 'break');
      if (!ok) return;

      const updatedGoals = goals.filter((item) => item.id !== goalId);
      await persistGoals(updatedGoals);
      setAvailableBalance((current) => current + goal.current);
      setSelectedGoal(null);
      setGoalAmountInput('');
      setNotice(`${goal.name} was broken and ${formatCurrency(goal.current, currency).replace(/^US\$/, '$')} returned to your available balance.`);
    } finally {
      setProcessingGoalId(null);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;
    if (goal.current > 0) {
      setError('Break this goal first before deleting it, so the saved balance returns to your available funds.');
      return;
    }

    const updatedGoals = goals.filter((item) => item.id !== goalId);
    await persistGoals(updatedGoals);
    setNotice(`${goal.name} was removed.`);
  };

  const renderGoalActionForm = (goal: SavingsGoal) => {
    if (selectedGoal !== goal.id) return null;

    const label = selectedGoalMode === 'fund' ? 'Amount to Move Into Savings' : 'Amount to Return to Available Balance';
    const actionHandler = selectedGoalMode === 'fund' ? handleFundGoal : handleWithdrawFromGoal;
    const buttonLabel = selectedGoalMode === 'fund' ? 'Fund Goal' : 'Withdraw to Balance';

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 pt-4 border-t border-border"
      >
        <Label htmlFor={`goal-action-${goal.id}`} className="text-sm font-medium">{label}</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id={`goal-action-${goal.id}`}
            type="number"
            placeholder="0.00"
            value={goalAmountInput}
            onChange={(event) => setGoalAmountInput(event.target.value)}
            className={`h-10 rounded-lg px-3 text-sm flex-1 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-[#f9fafb] border-0'} shadow-sm focus:shadow-md`}
          />
          <Button
            onClick={() => actionHandler(goal.id)}
            disabled={processingGoalId === goal.id}
            className="h-10 bg-[#00b388] hover:bg-[#009670] text-white shadow-sm hover:shadow-md"
          >
            {processingGoalId === goal.id ? 'Processing...' : buttonLabel}
          </Button>
          <Button
            onClick={() => {
              setSelectedGoal(null);
              setGoalAmountInput('');
            }}
            variant="outline"
            className="h-10 shadow-sm hover:shadow-md"
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-[#0d1117] text-white' : 'bg-background'} pb-24`}>
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
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`sticky top-0 z-10 ${darkMode ? 'bg-[#0d1117]/80 border-b border-[#21262d]' : 'bg-background border-b border-border'} backdrop-blur-lg px-6 py-4`}
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.1, rotate: -10 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
            style={{ backgroundColor: '#FFE5E5' }}
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#FF6B6B' }} />
          </motion.button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{ color: '#00a99d' }}
              >
                <PiggyBank className="w-6 h-6" />
              </motion.div>
              Savings Goals
            </h1>
            <p className="text-sm text-muted-foreground">Move money between available balance and your savings goals</p>
          </div>
        </div>
      </motion.div>

      <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">
        <ImageAnnouncementBar items={FLOW_ANNOUNCEMENT_SLIDES} className="h-[92px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card className="p-6 bg-gradient-to-br from-[#00b388] to-[#00a99d] border-0 shadow-md text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/80">Total Savings</h3>
              <PiggyBank className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(totalSavings, currency).replace(/^US\$/, '$')}</p>
            <p className="text-xs text-white/60 mt-2">Across {goals.length} goals</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-[#45B7D1] to-[#3498db] border-0 shadow-md text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/80">Available Balance</h3>
              <Wallet className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-3xl font-bold tabular-nums">{formattedAvailableBalance}</p>
            <p className="text-xs text-white/60 mt-2">Ready for transfers</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-[#96CEB4] to-[#6ba587] border-0 shadow-md text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/80">Overall Progress</h3>
              <TrendingUp className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-3xl font-bold">{overallProgress.toFixed(1)}%</p>
            <div className="w-full bg-white/20 rounded-full h-2 mt-3">
              <motion.div
                className="bg-white rounded-full h-2 transition-all duration-300"
                animate={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-[#f5b971] to-[#d9963f] border-0 shadow-md text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/80">Projected Interest</h3>
              <Gift className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(interestEarned, currency).replace(/^US\$/, '$')}</p>
            <p className="text-xs text-white/60 mt-2">4.2% annual reference</p>
          </Card>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Button
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Goal
          </Button>
        </motion.div>

        {showAddGoal && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`p-6 space-y-4 border ${darkMode ? 'border-[#21262d] bg-[#161b22]' : 'border-[#00b388]/20 bg-[#f0fdf4]'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create New Savings Goal</h3>
                <button
                  onClick={() => setShowAddGoal(false)}
                  aria-label="Close form"
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goalname" className="text-sm font-medium mb-2 block">Goal Name</Label>
                  <Input id="goalname" type="text" placeholder="Vacation, Emergency, Tuition" value={newGoalName} onChange={(event) => setNewGoalName(event.target.value)} className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-0'} rounded-lg px-3 text-sm shadow-sm focus:shadow-md`} />
                </div>
                <div>
                  <Label htmlFor="category" className="text-sm font-medium mb-2 block">Category</Label>
                  <select id="category" value={newGoalCategory} onChange={(event) => setNewGoalCategory(event.target.value)} className={`w-full h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-0'} rounded-lg px-3 text-sm shadow-sm focus:shadow-md appearance-none cursor-pointer`}>
                    <option value="Travel">Travel</option>
                    <option value="Emergency">Emergency Fund</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Education">Education</option>
                    <option value="Home">Home</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="target" className="text-sm font-medium mb-2 block">Target Amount</Label>
                  <Input id="target" type="number" placeholder="5000" value={newGoalTarget} onChange={(event) => setNewGoalTarget(event.target.value)} className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-0'} rounded-lg px-3 text-sm shadow-sm focus:shadow-md`} />
                </div>
                <div>
                  <Label htmlFor="deadline" className="text-sm font-medium mb-2 block">Target Deadline</Label>
                  <Input id="deadline" type="date" value={newGoalDeadline} onChange={(event) => setNewGoalDeadline(event.target.value)} className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-0'} rounded-lg px-3 text-sm shadow-sm focus:shadow-md`} />
                </div>
              </div>

              <Button onClick={handleAddGoal} className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium shadow-md hover:shadow-lg">
                Create Goal
              </Button>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold mb-6">Your Goals</h2>

          {loading ? (
            <Card className={`p-12 text-center ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <p className="text-muted-foreground">Loading savings goals...</p>
            </Card>
          ) : goals.length === 0 ? (
            <Card className={`p-12 text-center ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No savings goals yet. Create one to get started.</p>
              <Button onClick={() => setShowAddGoal(true)} className="bg-[#00b388] hover:bg-[#009670] text-white shadow-md hover:shadow-lg">
                Create First Goal
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const canDelete = goal.current <= 0;

                return (
                  <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={`p-6 hover:shadow-md transition-shadow ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
                      <div className="flex items-start justify-between mb-4 gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold" style={{ backgroundColor: goal.color }} aria-label={`${goal.name} goal icon`}>
                            {goal.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold truncate">{goal.name}</h3>
                            <p className="text-xs text-muted-foreground">{goal.category}</p>
                            <p className="text-xs text-muted-foreground mt-1">Saved {formatCurrency(goal.current, currency).replace(/^US\$/, '$')} of {formatCurrency(goal.target, currency).replace(/^US\$/, '$')}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className={`p-2 rounded-lg transition-colors ${canDelete ? 'hover:bg-red-50 text-red-600' : 'opacity-50 cursor-not-allowed text-red-300'}`}
                          title={canDelete ? 'Delete empty goal' : 'Break this goal before deleting it'}
                          disabled={!canDelete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2 gap-3">
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(goal.current, currency).replace(/^US\$/, '$')} currently saved</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${getGoalColorClass(goal.color)}`} title={`${progress.toFixed(1)}% progress`}>
                              {progress.toFixed(1)}%
                            </p>
                            {daysLeft > 0 ? (
                              <p className="text-xs text-muted-foreground">{daysLeft} days left</p>
                            ) : (
                              <p className="text-xs text-red-600">Deadline passed</p>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div className="rounded-full h-2 transition-all duration-300" animate={{ width: `${Math.min(progress, 100)}%`, backgroundColor: goal.color }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button
                          onClick={() => {
                            setSelectedGoal(goal.id);
                            setSelectedGoalMode('fund');
                            setGoalAmountInput('');
                          }}
                          className="h-10 bg-[#f9fafb] hover:bg-gray-100 text-[#00b388] border border-[#00b388]/20 font-medium shadow-sm hover:shadow-md rounded-lg flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Fund Goal
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedGoal(goal.id);
                            setSelectedGoalMode('withdraw');
                            setGoalAmountInput('');
                          }}
                          variant="outline"
                          className="h-10 shadow-sm hover:shadow-md rounded-lg flex items-center gap-2"
                        >
                          <ArrowDownCircle className="w-4 h-4" />
                          Withdraw
                        </Button>
                        <Button
                          onClick={() => handleBreakGoal(goal.id)}
                          variant="outline"
                          className="h-10 shadow-sm hover:shadow-md rounded-lg flex items-center gap-2"
                          disabled={processingGoalId === goal.id || goal.current <= 0}
                        >
                          <Scissors className="w-4 h-4" />
                          Break Goal
                        </Button>
                      </div>

                      {renderGoalActionForm(goal)}

                      {progress >= 100 && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-green-700 font-medium">Goal Completed</p>
                            <p className="text-xs text-green-600">You have reached your target amount.</p>
                          </div>
                        </div>
                      )}

                      {daysLeft < 30 && daysLeft > 0 && progress < 100 && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-amber-700 font-medium">Deadline Approaching</p>
                            <p className="text-xs text-amber-600">You have {daysLeft} days to reach this goal.</p>
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function getGoalColorClass(color: string) {
  switch (color) {
    case '#FF6B6B':
      return 'text-pink-500';
    case '#4ECDC4':
      return 'text-teal-400';
    case '#45B7D1':
      return 'text-sky-400';
    case '#96CEB4':
      return 'text-green-300';
    case '#FFEAA7':
      return 'text-yellow-200';
    case '#DDA15E':
      return 'text-yellow-700';
    default:
      return '';
  }
}
