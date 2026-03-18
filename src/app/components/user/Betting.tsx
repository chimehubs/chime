import { useEffect, useMemo, useState } from 'react';
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

export default function Betting() {
  const { user } = useAuthContext();
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<BettingTransferRecord[]>([]);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [provider, setProvider] = useState(SPORTSBOOKS[0]);
  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [profile, transactions] = await Promise.all([
        supabaseDbService.getProfile(user.id),
        supabaseDbService.getTransactions(user.id, 500),
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

    try {
      const account = await supabaseDbService.getAccountByUser(user.id);
      if (!account) {
        setError('No active account was found for this transfer.');
        return;
      }

      const transferAmount = Number(amountNumber.toFixed(2));
      const createdAt = new Date().toISOString();
      const record: BettingTransferRecord = {
        id: `bet_${Date.now()}`,
        provider,
        walletId: walletId.trim(),
        amount: transferAmount,
        note: note.trim() || undefined,
        createdAt,
        status: 'completed',
      };

      const transaction = await supabaseDbService.createTransaction({
        user_id: user.id,
        account_id: account.id,
        type: 'debit',
        amount: transferAmount,
        description: `Betting transfer to ${provider}`,
        currency: account.currency,
        status: 'completed',
        metadata: {
          feature: 'betting',
          provider,
          wallet_id: record.walletId,
          note: record.note || null,
        },
      });

      if (!transaction) {
        setError('The betting transfer could not be completed.');
        return;
      }

      await Promise.all([
        supabaseDbService.createActivity({
          user_id: user.id,
          type: 'betting',
          description: `Funded ${provider} betting wallet`,
          amount: transferAmount,
        }),
        supabaseDbService.createNotification({
          user_id: user.id,
          title: 'Betting Wallet Funded',
          message: `${formatCurrency(transferAmount, account.currency)} was sent to your ${provider} wallet.`,
          type: 'success',
          read: false,
          path: '/activity',
        }),
      ]);

      const nextTransfers = [record, ...history].slice(0, 20);
      setHistory(nextTransfers);
      setBalance((current) => current - transferAmount);
      await persistTransfers(nextTransfers);

      setSuccess(`Transferred ${formatCurrency(transferAmount, account.currency)} to ${provider}.`);
      setWalletId('');
      setAmount('');
      setNote('');
    } finally {
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

