import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Gift, AlertTriangle } from 'lucide-react';
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

export default function Cashback() {
  const { user } = useAuthContext();
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

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [profile, items] = await Promise.all([
        supabaseDbService.getProfile(user.id),
        supabaseDbService.getTransactions(user.id, 500),
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

  const claimedIds = useMemo(() => getClaimedCashbackTransactionIds(profilePreferences), [profilePreferences]);
  const eligibleTransactions = useMemo(() => getEligibleCashbackTransactions(transactions, claimedIds), [transactions, claimedIds]);
  const pendingCashback = useMemo(() => Number(
    eligibleTransactions.reduce((total, transaction) => total + Number(transaction.amount || 0) * CASHBACK_RATE, 0).toFixed(2),
  ), [eligibleTransactions]);
  const totalClaimed = useMemo(() => claims.reduce((total, claim) => total + Number(claim.amount || 0), 0), [claims]);

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
      description="Track eligible spend and claim credited rewards to your balance."
      darkMode={darkMode}
      icon={<Gift className="w-5 h-5 text-[#00a37a]" />}
      onBack={() => navigate('/dashboard')}
    >
      {loading ? (
        <Card className={`p-8 text-center ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
          <p className="text-muted-foreground">Loading cashback rewards...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="mt-3 text-3xl font-semibold">{formatCurrency(balance, currency).replace(/^US\$/, '$')}</p>
            </Card>
            <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <p className="text-sm text-muted-foreground">Available Cashback</p>
              <p className="mt-3 text-3xl font-semibold text-[#00a37a]">{formatCurrency(pendingCashback, currency).replace(/^US\$/, '$')}</p>
            </Card>
            <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <p className="text-sm text-muted-foreground">Total Claimed</p>
              <p className="mt-3 text-3xl font-semibold">{formatCurrency(totalClaimed, currency).replace(/^US\$/, '$')}</p>
            </Card>
          </div>

          <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <h2 className="text-xl font-semibold">Claim Your Rewards</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Eligible completed spend currently earns {Number(CASHBACK_RATE * 100).toFixed(2)}% cashback.
                </p>
              </div>
              <Button
                onClick={handleClaim}
                disabled={pendingCashback <= 0 || claiming}
                className="h-12 px-6 bg-gradient-to-r from-[#00A36C] to-[#008080] hover:from-[#00b377] hover:to-[#009191] text-white"
              >
                {claiming ? 'Claiming Cashback...' : 'Claim Cashback'}
              </Button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
                <CircleCheck className="w-4 h-4 mt-0.5" />
                <span>{success}</span>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
            <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <h2 className="text-lg font-semibold mb-4">Eligible Transactions</h2>
              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                {eligibleTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No eligible transactions are waiting for cashback right now.</p>
                ) : (
                  eligibleTransactions.map((transaction) => (
                    <div key={transaction.id} className={`rounded-xl border p-4 ${darkMode ? 'border-[#21262d] bg-[#0d1117]' : 'border-border bg-white'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'Pending date'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">-{formatCurrency(Number(transaction.amount || 0), currency).replace(/^US\$/, '$')}</p>
                          <p className="text-xs text-[#00a37a]">Reward {formatCurrency(Number(transaction.amount || 0) * CASHBACK_RATE, currency).replace(/^US\$/, '$')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <h2 className="text-lg font-semibold mb-4">Claim History</h2>
              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                {claims.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Claimed rewards will appear here.</p>
                ) : (
                  claims.map((claim) => (
                    <div key={claim.id} className={`rounded-xl border p-4 ${darkMode ? 'border-[#21262d] bg-[#0d1117]' : 'border-border bg-white'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">Cashback Claim</p>
                          <p className="text-xs text-muted-foreground">{new Date(claim.createdAt).toLocaleString()}</p>
                        </div>
                        <p className="font-semibold text-[#00a37a]">+{formatCurrency(claim.amount, currency).replace(/^US\$/, '$')}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Source transactions: {claim.sourceTransactionIds.length}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </UserFeaturePageShell>
  );
}

