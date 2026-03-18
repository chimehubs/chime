import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Target,
  TrendingUp,
  PiggyBank,
  Gift,
  Home,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2
} from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import AccountCreationPrompt from './AccountCreationPrompt';
import AccountCreationModal from './AccountCreationModal';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';

interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  category: string;
  deadline: string;
  color: string;
}

export default function Savings() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [showAccountCreationPrompt, setShowAccountCreationPrompt] = useState(false);
  const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});

  // Check account creation status
  useEffect(() => {
    if (user?.status === 'UNREGISTERED') {
      setShowAccountCreationPrompt(true);
    } else {
      setShowAccountCreationPrompt(false);
      setShowAccountCreationModal(false);
    }
  }, [user?.status]);

  // Savings state
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      const profile = await supabaseDbService.getProfile(user.id);
      const prefs = profile?.preferences || {};
      setProfilePreferences(prefs);
      if (prefs?.darkMode !== undefined) setDarkMode(!!prefs.darkMode);
      if (prefs?.savingsGoals?.length) {
        setGoals(prefs.savingsGoals);
      } else {
        setGoals([]);
      }
    };
    loadPreferences();
  }, [user?.id]);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Other');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const totalSavings = goals.reduce((sum, goal) => sum + goal.current, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const interestEarned = totalSavings * 0.042; // 4.2% annual interest
  const overallProgress = (totalSavings / totalTarget) * 100;

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA15E'];

  const handleAddGoal = () => {
    if (!newGoalName || !newGoalTarget || !newGoalDeadline) {
      alert('Please fill in all fields');
      return;
    }

    const goal: SavingsGoal = {
      id: Date.now().toString(),
      name: newGoalName,
      target: parseFloat(newGoalTarget),
      current: 0,
      category: newGoalCategory,
      deadline: newGoalDeadline,
      color: colors[goals.length % colors.length]
    };

    const updatedGoals = [...goals, goal];
    setGoals(updatedGoals);
    if (user?.id) {
      supabaseDbService.updateProfile(user.id, {
        preferences: { ...profilePreferences, savingsGoals: updatedGoals }
      });
    }

    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCategory('Other');
    setNewGoalDeadline('');
    setShowAddGoal(false);
  };

  const handleAddToGoal = (goalId: string) => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const updatedGoals = goals.map((goal) =>
      goal.id === goalId
        ? { ...goal, current: goal.current + parseFloat(addAmount) }
        : goal
    );

    setGoals(updatedGoals);
    if (user?.id) {
      supabaseDbService.updateProfile(user.id, {
        preferences: { ...profilePreferences, savingsGoals: updatedGoals }
      });
    }
    setAddAmount('');
    setSelectedGoal(null);
  };

  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter((goal) => goal.id !== goalId);
    setGoals(updatedGoals);
    if (user?.id) {
      supabaseDbService.updateProfile(user.id, {
        preferences: { ...profilePreferences, savingsGoals: updatedGoals }
      });
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-[#0d1117] text-white' : 'bg-background'} pb-24`}>
      {/* Account Creation Prompt - Shield feature access until user completes account creation */}
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

      {/* Header */}
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
            title="Go back"
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
            <p className="text-sm text-muted-foreground">Track and manage your savings goals</p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">
        {/* Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Total Savings */}
          <Card className="p-6 bg-gradient-to-br from-[#00b388] to-[#00a99d] border-0 shadow-md text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/80">Total Savings</h3>
              <PiggyBank className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-3xl font-bold tabular-nums">${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-white/60 mt-2">Across {goals.length} goals</p>
          </Card>

          {/* Overall Progress */}
          <Card className="p-6 bg-gradient-to-br from-[#45B7D1] to-[#3498db] border-0 shadow-md text-white">
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

          {/* Interest Earned */}
          <Card className="p-6 bg-gradient-to-br from-[#96CEB4] to-[#6ba587] border-0 shadow-md text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/80">Interest Earned</h3>
              <Gift className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-3xl font-bold tabular-nums">${interestEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-white/60 mt-2">4.2% Annual Rate</p>
          </Card>
        </motion.div>

        {/* Add Goal Button */}
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

        {/* Add Goal Form */}
        {showAddGoal && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 space-y-4 border border-[#00b388]/20 bg-[#f0fdf4]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create New Savings Goal</h3>
                <button
                  onClick={() => setShowAddGoal(false)}
                  aria-label="Close form"
                  className="p-1 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goalname" className="text-sm font-medium mb-2 block">Goal Name</Label>
                  <Input
                    id="goalname"
                    type="text"
                    placeholder="e.g., Vacation, Car, House"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    className="h-12 bg-white border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-medium mb-2 block">Category</Label>
                  <select
                    id="category"
                    aria-label="Goal Category"
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="w-full h-12 bg-white border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md appearance-none cursor-pointer"
                  >
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
                  <Input
                    id="target"
                    type="number"
                    placeholder="5000"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    className="h-12 bg-white border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md"
                  />
                </div>

                <div>
                  <Label htmlFor="deadline" className="text-sm font-medium mb-2 block">Target Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                    className="h-12 bg-white border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddGoal}
                className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-medium shadow-md hover:shadow-lg"
              >
                Create Goal
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Goals List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold mb-6">Your Goals</h2>
          
          {goals.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No savings goals yet. Create one to get started!</p>
              <Button
                onClick={() => setShowAddGoal(true)}
                className="bg-[#00b388] hover:bg-[#009670] text-white shadow-md hover:shadow-lg"
              >
                Create First Goal
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = (goal.current / goal.target) * 100;
                const daysLeft = Math.ceil(
                  (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold"
                            aria-label={`${goal.name} goal icon`}
                          >
                            {goal.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{goal.name}</h3>
                            <p className="text-xs text-muted-foreground">{goal.category}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                            title="Delete goal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">
                              ${goal.current.toLocaleString('en-US', { minimumFractionDigits: 2 })} of ${goal.target.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
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
                          <motion.div
                            className="rounded-full h-2 transition-all duration-300"
                            animate={{
                              width: `${Math.min(progress, 100)}%`,
                              backgroundColor: goal.color
                            }}
                          />
                        </div>
                      </div>

                      {/* Add Funds Section */}
                      {selectedGoal === goal.id ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3 pt-4 border-t border-border"
                        >
                          <Label htmlFor={`add-${goal.id}`} className="text-sm font-medium">Amount to Add</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`add-${goal.id}`}
                              type="number"
                              placeholder="0.00"
                              value={addAmount}
                              onChange={(e) => setAddAmount(e.target.value)}
                              className="h-10 bg-[#f9fafb] border-0 rounded-lg px-3 text-sm shadow-sm focus:shadow-md flex-1"
                            />
                            <Button
                              onClick={() => handleAddToGoal(goal.id)}
                              className="h-10 bg-[#00b388] hover:bg-[#009670] text-white shadow-sm hover:shadow-md"
                            >
                              Add
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedGoal(null);
                                setAddAmount('');
                              }}
                              variant="outline"
                              className="h-10 shadow-sm hover:shadow-md"
                            >
                              Cancel
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <Button
                          onClick={() => setSelectedGoal(goal.id)}
                          className="w-full h-10 bg-[#f9fafb] hover:bg-gray-100 text-[#00b388] border border-[#00b388]/20 font-medium shadow-sm hover:shadow-md rounded-lg"
                        >
                          Add Funds
                        </Button>
                      )}

                      {/* Goal Status */}
                      {progress >= 100 && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-green-700 font-medium">Goal Completed!</p>
                            <p className="text-xs text-green-600">You've reached your target amount.</p>
                          </div>
                        </div>
                      )}

                      {daysLeft < 30 && daysLeft > 0 && progress < 100 && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-amber-700 font-medium">Deadline Approaching</p>
                            <p className="text-xs text-amber-600">You have {daysLeft} days to reach your goal.</p>
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

// Utility to map color hex to a className
function getGoalColorClass(color: string) {
  switch (color) {
    case '#FF6B6B': return 'text-pink-500';
    case '#4ECDC4': return 'text-teal-400';
    case '#45B7D1': return 'text-sky-400';
    case '#96CEB4': return 'text-green-300';
    case '#FFEAA7': return 'text-yellow-200';
    case '#DDA15E': return 'text-yellow-700';
    default: return '';
  }
}
