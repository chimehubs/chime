import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, Dice5, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { formatCurrency } from '../ui/utils';
import UserFeaturePageShell from './UserFeaturePageShell';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { BettingTransferRecord, calculateCompletedBalance, getPreferenceArray } from './userAccountState';

const SPORTSBOOKS = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars Sportsbook', 'bet365', 'ESPN BET'];
const QUICK_AMOUNTS = [25, 50, 100, 200, 500, 1000];
const BETTING_HERO_SLIDES = [
  'https://cdn.wmnf.org/wp-content/uploads/2023/11/Sports-betting-gambling-by-wildpixel-via-iStock-for-WMNF-News-scaled.jpg',
  'https://sandiegobeer.news/wp-content/uploads/2025/02/sports-betting-on-toto-sites-1-770x470.jpg',
  'https://pavestoneslegal.com/wp-content/uploads/2019/05/sports-betting.jpg',
  'https://londonincmagazine.ca/wp-content/uploads/2025/04/Main-28.jpg',
  'https://www.talkrugbyunion.co.uk/wp-content/uploads/2024/08/0pener.jpg',
];

export default function Betting() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<BettingTransferRecord[]>([]);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');

  const [provider, setProvider] = useState(SPORTSBOOKS[0]);
  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [profile, transactions] = await Promise.all([
        supabaseDbService.getProfile(user.id),
        supabaseDbService.getTransactions(user.id, 1000),
      ]);

      const preferences = profile?.preferences || {};
      setProfilePreferences(preferences);
      setDarkMode(Boolean(preferences.darkMode));
      setHistory(getPreferenceArray<BettingTransferRecord>(preferences, 'bettingTransfers'));
      setBalance(calculateCompletedBalance(transactions));
      setCurrency(profile?.currency || user.currency || 'USD');
      setLoading(false);
    };

    loadData();
  }, [user?.id, user?.currency]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % BETTING_HERO_SLIDES.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  const amountNumber = useMemo(() => Number(amount || 0), [amount]);
  const canSubmit =
    !!user?.id &&
    user.status === 'ACTIVE' &&
    walletId.trim().length >= 4 &&
    amountNumber > 0 &&
    amountNumber <= balance;

  const persistTransfers = async (nextTransfers: BettingTransferRecord[]) => {
    if (!user?.id) return;
    const nextPreferences = { ...profilePreferences, bettingTransfers: nextTransfers };
    setProfilePreferences(nextPreferences);
    await supabaseDbService.updateProfile(user.id, { preferences: nextPreferences });
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (user.status !== 'ACTIVE') {
      setError('Activate your account before funding a betting wallet.');
      return;
    }
    if (!canSubmit) {
      setError('Provide a valid wallet ID and amount within your available balance.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    setProcessingMessage('Connecting to betting wallet...');

    try {
      const account = await supabaseDbService.getAccountByUser(user.id);
      if (!account) {
        setError('No active account was found for this transfer.');
        return;
      }

      const transferAmount = Number(amountNumber.toFixed(2));
      await new Promise((resolve) => window.setTimeout(resolve, 5000));

      const failedTransaction = await supabaseDbService.createTransaction({
        user_id: user.id,
        account_id: account.id,
        type: 'debit',
        amount: transferAmount,
        description: `Betting transfer to ${provider}`,
        currency: account.currency,
        status: 'failed',
        metadata: {
          feature: 'betting',
          provider,
          wallet_id: walletId.trim(),
          note: note.trim() || null,
          failure_reason: 'wallet_funding_failed_try_again',
        },
      });

      if (!failedTransaction) {
        setError('Wallet funding failed. Please try again.');
        return;
      }

      await Promise.all([
        supabaseDbService.createNotification({
          user_id: user.id,
          title: 'Betting Wallet Funding Failed',
          message: `Wallet funding failed for ${provider}. Please try again.`,
          type: 'error',
          read: false,
          path: '/dashboard/betting',
        }),
        supabaseDbService.createActivity({
          user_id: user.id,
          type: 'betting',
          description: `Betting wallet funding failed for ${provider}`,
          amount: transferAmount,
        }),
      ]);

      setError('Wallet funding failed. Please try again.');
    } finally {
      setProcessingMessage('');
      setSubmitting(false);
    }
  };

  return (
    <UserFeaturePageShell
      title="Betting"
      description="Fund licensed sportsbook wallets from your banking balance."
      darkMode={darkMode}
      icon={<Dice5 className="w-5 h-5 text-[#00a37a]" />}
      onBack={() => navigate('/dashboard')}
    >
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 h-[220px] sm:h-[260px] lg:h-[300px] shadow-[0_30px_80px_rgba(0,0,0,0.22)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={BETTING_HERO_SLIDES[heroSlide]}
            initial={{ opacity: 0.15, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.15, scale: 0.98 }}
            transition={{ duration: 0.95, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img
              src={BETTING_HERO_SLIDES[heroSlide]}
              alt="Betting hero slide"
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </AnimatePresence>
      </section>

      {loading ? (
        <Card className={`p-8 text-center ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
          <p className="text-muted-foreground">Loading betting transfers...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <Card className={`p-6 space-y-5 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Available balance</p>
                <p className="text-3xl font-semibold mt-2">{formatCurrency(balance, currency).replace(/^US\$/, '$')}</p>
              </div>
              <div className="rounded-2xl bg-[#e9f8f3] px-4 py-3 text-sm text-[#006b54] max-w-[220px]">
                Use only with regulated operators in your jurisdiction.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider" className="mb-2 block">Sportsbook</Label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  className={`w-full h-12 rounded-xl border px-3 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-border'}`}
                >
                  {SPORTSBOOKS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="walletId" className="mb-2 block">Wallet ID / Username</Label>
                <Input
                  id="walletId"
                  value={walletId}
                  onChange={(event) => setWalletId(event.target.value)}
                  placeholder="Enter sportsbook wallet ID"
                  className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="amount" className="mb-2 block">Transfer Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
              />
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">Quick Amounts</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setAmount(String(quickAmount))}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
                      Number(amount) === quickAmount
                        ? 'bg-[#00b388] text-white border-[#00b388]'
                        : darkMode
                          ? 'border-[#21262d] bg-[#0d1117] hover:border-[#00b388]'
                          : 'border-border bg-white hover:border-[#00b388]'
                    }`}
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="note" className="mb-2 block">Transfer Note</Label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note for internal tracking"
                className={`w-full rounded-xl border px-3 py-3 text-sm outline-none ${darkMode ? 'bg-[#0d1117] border-[#21262d] text-white' : 'bg-white border-border'}`}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
                <CircleCheck className="w-4 h-4 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {submitting && (
              <div className={`rounded-2xl border px-4 py-4 flex items-center gap-3 ${darkMode ? 'border-[#1d3b36] bg-[#0d1715]' : 'border-[#bde9da] bg-[#f2fbf8]'}`}>
                <div className="h-5 w-5 rounded-full border-2 border-[#00b388]/30 border-t-[#00b388] animate-spin" />
                <div>
                  <p className="text-sm font-semibold">Processing wallet funding</p>
                  <p className="text-xs text-muted-foreground">{processingMessage || 'Please wait...'}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full h-12 bg-gradient-to-r from-[#00A36C] to-[#008080] hover:from-[#00b377] hover:to-[#009191] text-white"
            >
              {submitting ? 'Processing Transfer...' : 'Fund Betting Wallet'}
            </Button>
          </Card>

          <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
            <h2 className="text-lg font-semibold mb-4">Recent Betting Transfers</h2>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Transfers to sportsbook wallets will appear here.</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className={`rounded-xl border p-4 ${darkMode ? 'border-[#21262d] bg-[#0d1117]' : 'border-border bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.provider}</p>
                        <p className="text-xs text-muted-foreground">Wallet: {item.walletId}</p>
                      </div>
                      <p className="font-semibold text-red-600">-{formatCurrency(item.amount, currency).replace(/^US\$/, '$')}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                    {item.note ? <p className="mt-2 text-xs text-muted-foreground">{item.note}</p> : null}
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
