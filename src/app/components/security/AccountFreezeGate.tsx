import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { formatCurrency } from '../ui/utils';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { AccountFreezeState, clearFreezeState, getActiveFreezeState, maskAccountNumber } from '../user/userAccountState';

const BYPASS_PATHS = new Set(['/chat', '/dashboard/withdraw']);
const SUPPORT_MESSAGE = 'Hello customer support, I need my unique 6-digit security PIN to continue my pending withdrawal.';

export default function AccountFreezeGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuthContext();
  const [freezeState, setFreezeState] = useState<AccountFreezeState | null>(getActiveFreezeState(user?.preferences));
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBypassedRoute = BYPASS_PATHS.has(location.pathname);

  useEffect(() => {
    const syncFreezeState = async () => {
      if (!user?.id || isBypassedRoute) {
        setFreezeState(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const profile = await supabaseDbService.getProfile(user.id);
      const preferences = profile?.preferences || user.preferences || {};
      const activeFreeze = getActiveFreezeState(preferences);
      setFreezeState(activeFreeze);
      if (profile) {
        updateUser({
          status: (profile.status as any) || user.status,
          preferences,
          currency: profile.currency || user.currency,
          name: profile.name || user.name,
          avatar: profile.avatar_url || user.avatar,
        });
      }
      setLoading(false);
    };

    syncFreezeState();
  }, [user?.id, location.pathname]);

  const handleOpenSupport = () => {
    navigate('/chat', {
      state: {
        from: location.pathname,
        prefillMessage: SUPPORT_MESSAGE,
      },
    });
  };

  const handleUnlock = async () => {
    if (!user?.id || !freezeState) return;
    if (pin.trim().length !== 6) {
      setError('Enter the 6-digit security PIN issued for this withdrawal.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const [profile, transactions] = await Promise.all([
        supabaseDbService.getProfile(user.id),
        supabaseDbService.getTransactions(user.id, 500),
      ]);

      const preferences = profile?.preferences || user.preferences || {};
      const latestFreeze = getActiveFreezeState(preferences);
      if (!latestFreeze) {
        setFreezeState(null);
        return;
      }

      if (pin.trim() !== latestFreeze.securityPin) {
        setError('The security PIN entered is incorrect.');
        return;
      }

      const pendingTransaction = transactions.find((transaction) => transaction.id === latestFreeze.pendingWithdrawalId) || null;
      const nextPreferences = clearFreezeState(preferences);

      await supabaseDbService.updateProfile(user.id, {
        status: 'ACTIVE' as any,
        preferences: nextPreferences,
      });

      if (pendingTransaction) {
        await supabaseDbService.updateTransaction(pendingTransaction.id, {
          status: 'completed',
          metadata: {
            ...(pendingTransaction.metadata || {}),
            requires_security_pin: false,
            security_pin_verified_at: new Date().toISOString(),
          },
        });

        await Promise.all([
          supabaseDbService.createActivity({
            user_id: user.id,
            type: 'withdrawal',
            description: 'Withdrawal completed after security PIN verification',
            amount: Number(latestFreeze.amount || pendingTransaction.amount || 0),
          }),
          supabaseDbService.createNotification({
            user_id: user.id,
            title: 'Withdrawal Completed',
            message: `${formatCurrency(Number(latestFreeze.amount || pendingTransaction.amount || 0), latestFreeze.currency || pendingTransaction.currency || user.currency || 'USD')} has been released to your destination account.`,
            type: 'success',
            read: false,
            path: '/activity',
          }),
        ]);
      }

      updateUser({
        status: 'ACTIVE',
        preferences: nextPreferences,
      });
      setFreezeState(null);
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBypassedRoute) {
    return <>{children}</>;
  }

  if (loading && user?.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-[#050b0a] flex items-center justify-center px-6">
        <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-[#00b388] animate-spin" />
      </div>
    );
  }

  if (!freezeState) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#050b0a] relative overflow-hidden flex items-center justify-center px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,163,108,0.16),transparent_36%),linear-gradient(180deg,#071210_0%,#050b0a_100%)]" />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg">
        <Card className="border border-white/10 bg-[#0d1614]/85 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] text-white p-7 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e9f8f3] flex items-center justify-center flex-shrink-0">
              <LockKeyhole className="w-6 h-6 text-[#008a69]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Account Security Hold</p>
              <h1 className="mt-2 text-2xl font-semibold">Your account is temporarily frozen</h1>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                We detected a withdrawal that requires an additional 6-digit security PIN before funds can be released.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/60">Pending withdrawal</span>
              <span className="font-semibold">{formatCurrency(Number(freezeState.amount || 0), freezeState.currency || user?.currency || 'USD').replace(/^US\$/, '$')}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/60">Destination bank</span>
              <span className="font-semibold text-right">{freezeState.bankName || 'External Bank'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/60">Account number</span>
              <span className="font-semibold">{maskAccountNumber(freezeState.accountNumber)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/60">Release window</span>
              <span className="font-semibold">Under 1 minute after PIN verification</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="security-pin" className="text-white/80">Enter 6-Digit Security PIN</Label>
            <Input
              id="security-pin"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/35"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 mt-0.5" />
            <span>
              Until the correct PIN is verified, the withdrawal stays pending and your balance will not be reduced.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={handleUnlock}
              disabled={isSubmitting}
              className="h-12 bg-gradient-to-r from-[#00A36C] to-[#008080] hover:from-[#00b377] hover:to-[#009191] text-white"
            >
              {isSubmitting ? 'Verifying PIN...' : 'Verify & Unfreeze'}
            </Button>
            <Button
              onClick={handleOpenSupport}
              variant="outline"
              className="h-12 border-white/15 text-white bg-white/5 hover:bg-white/10"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Get PIN From Support
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function Label({ htmlFor, className, children }: { htmlFor: string; className?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  );
}
