import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  CreditCard,
  LogOut,
  ArrowLeft,
  Unlock
} from 'lucide-react';
import { Card } from '../ui/card';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService, type Account, type VirtualCard } from '../../../services/supabaseDbService';
import AccountCreationPrompt from './AccountCreationPrompt';
import AccountCreationModal from './AccountCreationModal';
import './Cards.css';

export default function Cards() {
  const navigate = useNavigate();
  const { logout, user } = useAuthContext();
  const [darkMode, setDarkMode] = useState(false);
  const [showAccountCreationPrompt, setShowAccountCreationPrompt] = useState(false);
  const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balancesByAccount, setBalancesByAccount] = useState<Map<string, number>>(new Map());
  const [visibleCardNumbers, setVisibleCardNumbers] = useState<Set<string>>(new Set());
  const [frozenCards, setFrozenCards] = useState<Set<string>>(new Set());
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
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

  useEffect(() => {
    let mounted = true;
    const loadPreferences = async () => {
      if (!user?.id) return;
      const profile = await supabaseDbService.getProfile(user.id);
      if (!mounted || !profile) return;
      const prefDarkMode = Boolean(profile.preferences?.darkMode);
      setDarkMode(prefDarkMode);
    };
    loadPreferences();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Load virtual cards on mount
  useEffect(() => {
    loadCards();
  }, [user?.id, user?.status]);

  const loadCards = async () => {
    if (!user?.id || user.status !== 'ACTIVE') {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [accountsData, cardData, txnData] = await Promise.all([
      supabaseDbService.getAccounts(user.id),
      supabaseDbService.getVirtualCards(user.id),
      supabaseDbService.getTransactions(user.id, 500),
    ]);

    const balanceMap = new Map<string, number>();
    txnData
      .filter((txn) => txn.status === 'completed')
      .forEach(txn => {
      const amount = Number(txn.amount || 0);
      const current = balanceMap.get(txn.account_id) || 0;
      balanceMap.set(txn.account_id, txn.type === 'credit' ? current + amount : current - amount);
      });

    const frozen = new Set<string>();
    cardData.forEach(card => {
      if (card.status === 'FROZEN') frozen.add(card.id);
    });

    setAccounts(accountsData);
    setBalancesByAccount(balanceMap);
    setFrozenCards(frozen);
    setCards(cardData);
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleCardNumberVisibility = (cardId: string) => {
    const newVisible = new Set(visibleCardNumbers);
    if (newVisible.has(cardId)) {
      newVisible.delete(cardId);
    } else {
      newVisible.add(cardId);
    }
    setVisibleCardNumbers(newVisible);
  };

  const toggleFreezeCard = async (cardId: string) => {
    const newFrozen = new Set(frozenCards);
    if (newFrozen.has(cardId)) {
      newFrozen.delete(cardId);
      await supabaseDbService.updateVirtualCard(cardId, { status: 'ACTIVE' });
      setCards((prev) => prev.map(card => card.id === cardId ? { ...card, status: 'ACTIVE' } : card));
    } else {
      newFrozen.add(cardId);
      await supabaseDbService.updateVirtualCard(cardId, { status: 'FROZEN' });
      setCards((prev) => prev.map(card => card.id === cardId ? { ...card, status: 'FROZEN' } : card));
    }
    setFrozenCards(newFrozen);
  };

  const copyToClipboard = (cardNumber: string, cardId: string) => {
    navigator.clipboard.writeText(cardNumber);
    setCopiedCardId(cardId);
    setTimeout(() => setCopiedCardId(null), 2000);
  };

  const maskCardNumber = (cardNumber: string) => {
    const last4 = cardNumber.slice(-4);
    return `**** **** **** ${last4}`;
  };

  const formatCardNumber = (cardNumber: string) => {
    return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatMoney = (value: number, currencyCode: string) => {
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
    return currencyCode === 'USD' ? formatted.replace(/^US\$/, '$') : formatted;
  };

  const getCardMeta = (card: VirtualCard) => {
    const account = accounts.find(acc => acc.id === card.account_id);
    return {
      balance: balancesByAccount.get(card.account_id) ?? 0,
      currency: account?.currency || user?.currency || 'USD',
      accountNumber: account?.account_number,
      cardType: account?.account_type || 'DEBIT',
    };
  };

  // Account creation handled via modal (see AccountCreationModal)

  // Check if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Please Login</h2>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to access cards.
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

  if (user?.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
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
            loadCards();
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Cards Not Available</h2>
          <p className="text-muted-foreground mb-6">
            Your account must be active to access virtual cards. Create your account to get started.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAccountCreationModal(true)}
            className="px-6 py-3 bg-[#00b388] text-white rounded-lg font-semibold hover:bg-[#009670] transition-colors mb-3"
          >
            Create Your Account
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-400 transition-colors block w-full"
          >
            Back to Dashboard
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
          loadCards();
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
                style={{ color: '#ec4899' }}
              >
                <CreditCard className="w-6 h-6" />
              </motion.div>
              My Cards
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{cards.length} card{cards.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => navigate('/dashboard')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="h-10 px-3 rounded-full flex items-center justify-center gap-2 transition-colors shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#FFE5E5' }}
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: '#FF6B6B' }} />
              <span className="hidden sm:inline text-sm font-medium" style={{ color: '#FF6B6B' }}>
                Back to Dashboard
              </span>
            </motion.button>
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.3 }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#ffebee' }}
              title="Sign out"
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="px-6 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-muted-foreground">Loading cards...</div>
          </div>
        ) : cards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-4">
              <CreditCard className="w-8 h-8 text-[#00b388]" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No Cards Yet</h2>
            <p className="text-muted-foreground mb-6">
              Your virtual debit card was provisioned when your account was activated.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadCards}
              className="px-6 py-3 bg-[#00b388] text-white rounded-lg font-semibold hover:bg-[#009670] transition-colors"
            >
              Refresh
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {cards.map((card, index) => {
              const cardMeta = getCardMeta(card);
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                                    {/* Card Design */}
                  <div className="relative mx-auto w-full max-w-[360px]">
                    <div
                      className={`relative overflow-hidden rounded-2xl border border-white/20 px-5 py-4 h-[220px] flex flex-col justify-between transition-all ${
                        frozenCards.has(card.id)
                          ? 'bg-gradient-to-br from-gray-500 to-gray-600'
                          : 'bg-gradient-to-br from-[#00b388] to-[#008080]'
                      }`}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_48%)]" />

                      {/* Frozen Badge */}
                      {frozenCards.has(card.id) && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center z-20">
                          <div className="flex flex-col items-center gap-2 text-white">
                            <Lock className="w-8 h-8" />
                            <span className="font-semibold">Card Frozen</span>
                          </div>
                        </div>
                      )}

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="w-10 h-8 rounded-md border border-white/40 bg-white/20 backdrop-blur-sm" />
                        <div className="text-right">
                          <p className="text-[11px] font-semibold tracking-[0.2em] text-white">VISA</p>
                          <p className="text-[10px] text-white/80 uppercase tracking-wider">{cardMeta.cardType}</p>
                        </div>
                      </div>

                      {/* Card Number */}
                      <div className="relative z-10 mt-2">
                        <p className="text-white/80 text-[10px] mb-1 uppercase tracking-widest">Card Number</p>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-base sm:text-lg font-mono tracking-[0.18em] leading-none">
                            {visibleCardNumbers.has(card.id)
                              ? formatCardNumber(card.card_number)
                              : maskCardNumber(card.card_number)}
                          </p>
                          <button
                            onClick={() => toggleCardNumberVisibility(card.id)}
                            className="text-white/70 hover:text-white transition-colors"
                            title={visibleCardNumbers.has(card.id) ? 'Hide card number' : 'Show card number'}
                          >
                            {visibleCardNumbers.has(card.id) ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(card.card_number, card.id)}
                            className="text-white/70 hover:text-white transition-colors"
                            title="Copy card number"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        {copiedCardId === card.id && (
                          <p className="text-white text-xs mt-1">Copied</p>
                        )}
                      </div>

                      {/* Bottom Section */}
                      <div className="relative z-10 grid grid-cols-3 gap-3 text-[11px]">
                        <div>
                          <p className="text-white/75 uppercase tracking-widest text-[10px]">Expires</p>
                          <p className="text-white font-mono font-semibold">{card.expiry_date}</p>
                        </div>
                        <div>
                          <p className="text-white/75 uppercase tracking-widest text-[10px]">CVV</p>
                          <p className="text-white font-mono font-semibold">{card.cvv}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/75 uppercase tracking-widest text-[10px]">Holder</p>
                          <p className="text-white font-semibold truncate">{user?.name || 'CHIME USER'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index * 0.1) + 0.2 }}
                      className="mt-4 grid grid-cols-2 gap-3"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleFreezeCard(card.id)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg font-semibold transition-colors ${
                          frozenCards.has(card.id)
                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        }`}
                      >
                        {frozenCards.has(card.id) ? (
                          <>
                            <Unlock className="w-4 h-4" />
                            Unfreeze
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Freeze
                          </>
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center justify-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition-colors"
                        disabled
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </motion.button>
                    </motion.div>
                  </div>

                  {/* Card Details */}
                  <Card className={`mt-4 p-4 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-muted-foreground">App</span>
                        <span className="font-medium">Chimahub</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-muted-foreground">Available Balance</span>
                        <span className="font-semibold tabular-nums">{formatMoney(cardMeta.balance, cardMeta.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-muted-foreground">Daily Limit</span>
                        <span className="text-xs font-semibold">{formatMoney(Number(card.daily_limit || 5000), cardMeta.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-muted-foreground">Issued</span>
                        <span className="text-xs">{card.created_at ? new Date(card.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-muted-foreground">Linked Account</span>
                        <span className="text-xs font-mono">{cardMeta.accountNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-muted-foreground">Card ID</span>
                        <span className="font-mono text-xs break-all text-right">{card.id}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`text-xs font-semibold ${card.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'}`}>
                          {card.status}
                        </span>
                      </div>
                    </div>
                  </Card>
              </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}



