import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  BadgeDollarSign,
  CircleCheck,
  Gift,
  ReceiptText,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { formatCurrency } from '../ui/utils';
import UserFeaturePageShell from './UserFeaturePageShell';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService, type Transaction } from '../../../services/supabaseDbService';
import {
  CashbackClaimRecord,
  calculateCompletedBalance,
  getClaimedCashbackTransactionIds,
  getEligibleCashbackTransactions,
  getPreferenceArray,
} from './userAccountState';

const CASHBACK_RATE = 0.0125;
const CASHBACK_HERO_SLIDES = [
  'https://www.shutterstock.com/image-vector/cashback-icon-isolated-on-blue-600nw-2293014757.jpg',
  'https://img.freepik.com/free-vector/cashback-label-collection_23-2148486944.jpg?semt=ais_user_personalization&w=740&q=80',
  'https://blog.mentalistas.com/wp-content/uploads/2021/12/cashback.png',
];

export default function Cashback() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [claims, setClaims] = useState<CashbackClaimRecord[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [profile, items] = await Promise.all([
        supabaseDbService.getProfile(user.id),
        supabaseDbService.getTransactions(user.id, 1000),
      ]);

      const preferences = profile?.preferences || {};
      setProfilePreferences(preferences);
      setDarkMode(Boolean(preferences.darkMode));
      setClaims(getPreferenceArray<CashbackClaimRecord>(preferences, 'cashbackClaims'));
      setTransactions(items);
      setBalance(calculateCompletedBalance(items));
      setCurrency(profile?.currency || user.currency || 'USD');
      setLoading(false);
    };

    loadData();
  }, [user?.id, user?.currency]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % CASHBACK_HERO_SLIDES.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  const claimedIds = useMemo(() => getClaimedCashbackTransactionIds(profilePreferences), [profilePreferences]);
  const eligibleTransactions = useMemo(
    () => getEligibleCashbackTransactions(transactions, claimedIds),
    [transactions, claimedIds],
  );
  const pendingCashback = useMemo(
    () =>
      Number(
        eligibleTransactions
          .reduce((total, transaction) => total + Number(transaction.amount || 0) * CASHBACK_RATE, 0)
          .toFixed(2),
      ),
    [eligibleTransactions],
  );
  const totalClaimed = useMemo(
    () => claims.reduce((total, claim) => total + Number(claim.amount || 0), 0),
    [claims],
  );

  const formattedBalance = formatCurrency(balance, currency).replace(/^US\$/, '$');
  const formattedPending = formatCurrency(pendingCashback, currency).replace(/^US\$/, '$');
  const formattedClaimed = formatCurrency(totalClaimed, currency).replace(/^US\$/, '$');
  const summaryCards = [
    {
      label: 'Current Balance',
      value: formattedBalance,
      icon: WalletCards,
      accent: 'from-emerald-500/30 via-teal-500/20 to-cyan-500/20',
      iconClass: 'text-emerald-200',
    },
    {
      label: 'Available Cashback',
      value: formattedPending,
      icon: BadgeDollarSign,
      accent: 'from-cyan-500/35 via-sky-500/20 to-emerald-400/20',
      iconClass: 'text-cyan-100',
    },
    {
      label: 'Total Claimed',
      value: formattedClaimed,
      icon: Gift,
      accent: 'from-amber-400/30 via-orange-400/20 to-yellow-300/20',
      iconClass: 'text-amber-100',
    },
    {
      label: 'Eligible Purchases',
      value: String(eligibleTransactions.length),
      icon: TrendingUp,
      accent: 'from-violet-500/30 via-fuchsia-500/15 to-cyan-400/15',
      iconClass: 'text-fuchsia-100',
    },
  ];

  const shellCardClass = darkMode
    ? 'border-white/10 bg-white/5 text-white backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.28)]'
    : 'border-slate-200/80 bg-white/80 text-slate-950 backdrop-blur-xl shadow-[0_24px_60px_rgba(15,23,42,0.12)]';

  const innerCardClass = darkMode
    ? 'border-white/10 bg-black/20'
    : 'border-slate-200/80 bg-white/90';

  const mutedTextClass = darkMode ? 'text-slate-300' : 'text-slate-600';

  const handleClaim = async () => {
    if (!user?.id) return;
    if (user.status !== 'ACTIVE') {
      setError('Activate your account before claiming cashback rewards.');
      return;
    }
    if (pendingCashback <= 0) {
      setError('No cashback is available to claim yet.');
      return;
    }

    setClaiming(true);
    setError('');
    setSuccess('');

    try {
      const account = await supabaseDbService.getAccountByUser(user.id);
      if (!account) {
        setError('No active account was found for cashback credit.');
        return;
      }

      const claim: CashbackClaimRecord = {
        id: `cashback_${Date.now()}`,
        amount: pendingCashback,
        createdAt: new Date().toISOString(),
        sourceTransactionIds: eligibleTransactions.map((transaction) => transaction.id),
      };

      const transaction = await supabaseDbService.createTransaction({
        user_id: user.id,
        account_id: account.id,
        type: 'credit',
        amount: pendingCashback,
        description: 'Cashback reward credited',
        currency: account.currency,
        status: 'completed',
        metadata: {
          feature: 'cashback',
          source_transaction_ids: claim.sourceTransactionIds,
        },
      });

      if (!transaction) {
        setError('Cashback claim could not be completed.');
        return;
      }

      await Promise.all([
        supabaseDbService.createActivity({
          user_id: user.id,
          type: 'cashback',
          description: 'Cashback reward credited',
          amount: pendingCashback,
        }),
        supabaseDbService.createNotification({
          user_id: user.id,
          title: 'Cashback Claimed',
          message: `${formatCurrency(pendingCashback, account.currency)} cashback has been added to your balance.`,
          type: 'success',
          read: false,
          path: '/activity',
        }),
      ]);

      const nextClaims = [claim, ...claims];
      const nextPreferences = { ...profilePreferences, cashbackClaims: nextClaims };
      setClaims(nextClaims);
      setProfilePreferences(nextPreferences);
      setBalance((current) => current + pendingCashback);
      await supabaseDbService.updateProfile(user.id, { preferences: nextPreferences });
      setSuccess(`Claimed ${formatCurrency(pendingCashback, account.currency)} in cashback rewards.`);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <UserFeaturePageShell
      title="Cashback"
      description="Track reward-eligible spend and move earned cashback into your balance."
      darkMode={darkMode}
      icon={<Gift className="h-5 w-5 text-[#00a37a]" />}
      onBack={() => navigate('/dashboard')}
    >
      <section className="relative h-[220px] overflow-hidden rounded-[32px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.22)] sm:h-[260px] lg:h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={CASHBACK_HERO_SLIDES[heroSlide]}
            initial={{ opacity: 0.18, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.18, scale: 0.98 }}
            transition={{ duration: 0.95, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img
              src={CASHBACK_HERO_SLIDES[heroSlide]}
              alt="Cashback hero slide"
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </AnimatePresence>
      </section>

      {loading ? (
        <Card className={`p-8 text-center ${shellCardClass}`}>
          <p className={mutedTextClass}>Loading cashback rewards...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.label}
                  className={`relative overflow-hidden border-0 p-5 text-white shadow-[0_24px_50px_rgba(0,0,0,0.18)] ${darkMode ? 'bg-[#071b18]' : 'bg-slate-950'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%)]" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/70">{item.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
                      <Icon className={`h-5 w-5 ${item.iconClass}`} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className={`overflow-hidden p-0 ${shellCardClass}`}>
              <div className="border-b border-white/10 bg-gradient-to-r from-[#00a37a]/18 via-[#10b981]/12 to-[#0ea5e9]/18 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-white/80 uppercase">
                      <Sparkles className="h-3.5 w-3.5 text-[#7ef5cf]" />
                      Reward Program
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">Claim your cashback when it is ready</h2>
                    <p className={`max-w-2xl text-sm ${mutedTextClass}`}>
                      Qualified completed spending earns {Number(CASHBACK_RATE * 100).toFixed(2)}% cashback.
                      Claims move directly into your available balance once approved.
                    </p>
                  </div>
                  <Button
                    onClick={handleClaim}
                    disabled={pendingCashback <= 0 || claiming}
                    className="h-12 rounded-2xl bg-gradient-to-r from-[#00A36C] via-[#00b388] to-[#008080] px-6 text-white shadow-[0_14px_30px_rgba(0,163,108,0.24)] hover:from-[#00b377] hover:via-[#00c396] hover:to-[#009191]"
                  >
                    {claiming ? 'Claiming Cashback...' : 'Claim Cashback'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-3">
                <div className={`rounded-3xl border p-4 ${innerCardClass}`}>
                  <div className="mb-3 inline-flex rounded-2xl bg-emerald-500/15 p-3 text-emerald-400">
                    <BadgeDollarSign className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Available now</p>
                  <p className="mt-2 text-2xl font-semibold">{formattedPending}</p>
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>Ready to be credited into your account balance.</p>
                </div>
                <div className={`rounded-3xl border p-4 ${innerCardClass}`}>
                  <div className="mb-3 inline-flex rounded-2xl bg-cyan-500/15 p-3 text-cyan-400">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Eligible transactions</p>
                  <p className="mt-2 text-2xl font-semibold">{eligibleTransactions.length}</p>
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>Only completed spend that has not been claimed counts.</p>
                </div>
                <div className={`rounded-3xl border p-4 ${innerCardClass}`}>
                  <div className="mb-3 inline-flex rounded-2xl bg-fuchsia-500/15 p-3 text-fuchsia-400">
                    <Gift className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Lifetime claimed</p>
                  <p className="mt-2 text-2xl font-semibold">{formattedClaimed}</p>
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>Every credited cashback payout is recorded below.</p>
                </div>
              </div>

              {(error || success) && (
                <div className="px-6 pb-6">
                  {error ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  {success ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </Card>

            <Card className={`p-6 ${shellCardClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Claim History</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Your recent cashback credits and settled reward payouts.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <Gift className="h-5 w-5 text-[#7ef5cf]" />
                </div>
              </div>

              <div className="mt-5 space-y-3 max-h-[430px] overflow-y-auto pr-1">
                {claims.length === 0 ? (
                  <div className={`rounded-3xl border p-5 ${innerCardClass}`}>
                    <p className="font-medium">No rewards claimed yet</p>
                    <p className={`mt-2 text-sm ${mutedTextClass}`}>
                      Once you claim cashback, the credit details will appear here.
                    </p>
                  </div>
                ) : (
                  claims.map((claim) => (
                    <div key={claim.id} className={`rounded-3xl border p-4 ${innerCardClass}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">Cashback Claim</p>
                          <p className={`mt-1 text-xs ${mutedTextClass}`}>{new Date(claim.createdAt).toLocaleString()}</p>
                        </div>
                        <p className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                          +{formatCurrency(claim.amount, currency).replace(/^US\$/, '$')}
                        </p>
                      </div>
                      <p className={`mt-3 text-xs ${mutedTextClass}`}>
                        Source transactions: {claim.sourceTransactionIds.length}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card className={`p-6 ${shellCardClass}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Eligible Transactions</h2>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                  Completed transactions that are waiting to be converted into cashback.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/75">
                Live reward queue
              </div>
            </div>

            <div className="mt-5 space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {eligibleTransactions.length === 0 ? (
                <div className={`rounded-3xl border p-5 ${innerCardClass}`}>
                  <p className="font-medium">No eligible transactions right now</p>
                  <p className={`mt-2 text-sm ${mutedTextClass}`}>
                    New completed spending will appear here automatically when it qualifies for cashback.
                  </p>
                </div>
              ) : (
                eligibleTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`rounded-3xl border p-4 transition-transform hover:-translate-y-0.5 ${innerCardClass}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold">{transaction.description}</p>
                        <p className={`mt-1 text-xs ${mutedTextClass}`}>
                          {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'Pending date'}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-semibold text-red-400">
                          -{formatCurrency(Number(transaction.amount || 0), currency).replace(/^US\$/, '$')}
                        </p>
                        <p className="mt-1 text-xs font-medium text-emerald-300">
                          Reward {formatCurrency(Number(transaction.amount || 0) * CASHBACK_RATE, currency).replace(/^US\$/, '$')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </UserFeaturePageShell>
  );
}
