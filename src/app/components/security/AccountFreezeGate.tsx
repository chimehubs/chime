import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { formatCurrency } from '../ui/utils';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { AccountFreezeState, clearFreezeState, DEFAULT_SECURITY_PIN, getActiveFreezeState, maskAccountNumber } from '../user/userAccountState';

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
  const isAdminActionHold = freezeState?.reason === 'admin_action';
  const isLiquidatedAccount = freezeState?.reason === 'account_liquidation';

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
    if (freezeState.reason === 'account_liquidation') {
      setError('This account has been liquidated. Contact customer support if you need final records or assistance.');
      return;
    }
    if (freezeState.reason === 'admin_action') {
      setError('This account freeze was applied by account control. Contact customer support or wait for admin reactivation.');
      return;
    }
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

      const normalizedPin = pin.trim();
      const acceptedPins = new Set([latestFreeze.securityPin, DEFAULT_SECURITY_PIN]);

      if (!acceptedPins.has(normalizedPin)) {
        setError('The security PIN entered is incorrect.');
        return;
      }

      const pendingTransaction = latestFreeze.pendingWithdrawalId
        ? transactions.find((transaction) => transaction.id === latestFreeze.pendingWithdrawalId) || null
        : null;
      const nextPreferences = clearFreezeState(preferences);

      await supabaseDbService.updateProfile(user.id, {
        status: 'ACTIVE' as any,
        preferences: nextPreferences,
      });

      if (pendingTransaction) {
        await supabaseDbService.updateTransaction(pendingTransaction.id, {
          status: 'failed',
          metadata: {
            ...(pendingTransaction.metadata || {}),
            requires_security_pin: false,
            security_pin_verified_at: new Date().toISOString(),
            security_reset_required_restart: true,
          },
        });

        await Promise.all([
          supabaseDbService.createActivity({
            user_id: user.id,
            type: 'withdrawal',
            description: 'Account reactivated after security PIN verification. Held withdrawal cancelled.',
            amount: Number(latestFreeze.amount || pendingTransaction.amount || 0),
          }),
          supabaseDbService.createNotification({
            user_id: user.id,
            title: 'Account Reactivated',
            message: `${formatCurrency(Number(latestFreeze.amount || pendingTransaction.amount || 0), latestFreeze.currency || pendingTransaction.currency || user.currency || 'USD')} withdrawal was cancelled after security verification. Start a new withdrawal when you are ready.`,
            type: 'info',
            read: false,
            path: '/dashboard/withdraw',
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
    <div className="min-h-screen bg-[#120708] relative overflow-hidden flex items-center justify-center px-6 py-10">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage:
              "url('https://www.shutterstock.com/image-vector/frozen-bank-accountvector-art-that-600nw-2414078733.jpg')",
            filter: 'sepia(0.08) saturate(0.7) contrast(0.95) brightness(0.38)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#17090b]/78 to-black/82" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.72)_100%)]" />
        <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 w-96 h-96 rounded-full bg-rose-500/18 blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg">
        <Card className="relative border border-white/12 bg-[linear-gradient(180deg,rgba(70,12,18,0.88)_0%,rgba(36,8,11,0.94)_100%)] backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.55)] text-white p-7 space-y-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)] pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50/90 flex items-center justify-center flex-shrink-0">
              <LockKeyhole className="w-6 h-6 text-[#b42318]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/50">Account Security Hold</p>
              <h1 className="mt-2 text-2xl font-semibold">Your account is temporarily frozen</h1>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                {isLiquidatedAccount
                  ? 'Your account has been liquidated by your account manager with your prior consent. Access to banking services is now closed.'
                  : isAdminActionHold
                  ? 'Your account has been temporarily frozen by account control. Access remains restricted until the freeze is lifted.'
                  : 'We detected a withdrawal that requires an additional 6-digit security PIN before your account can be reactivated.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 space-y-3 text-sm">
            {isLiquidatedAccount ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/60">Action source</span>
                  <span className="font-semibold">Account manager liquidation</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/60">Current state</span>
                  <span className="font-semibold">Account liquidated</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-white/60">Liquidation note</span>
                  <span className="font-semibold text-right">{freezeState.adminNote || 'No additional note provided.'}</span>
                </div>
              </>
            ) : isAdminActionHold ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/60">Freeze source</span>
                  <span className="font-semibold">Admin account control</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/60">Current state</span>
                  <span className="font-semibold">Access restricted</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-white/60">Admin note</span>
                  <span className="font-semibold text-right">{freezeState.adminNote || 'No additional note provided.'}</span>
                </div>
              </>
            ) : (
              <>
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
                  <span className="text-white/60">Unlock outcome</span>
                  <span className="font-semibold">Account reactivated, withdrawal cancelled</span>
                </div>
              </>
            )}
          </div>

          {freezeState.reason === 'withdrawal_security_pin' ? (
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
          ) : null}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-50 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 mt-0.5" />
            <span>
              {isLiquidatedAccount
                ? 'This account remains closed after liquidation. Customer support can help with final statements or post-liquidation questions.'
                : isAdminActionHold
                ? 'This restriction stays active until account control removes it. Customer support remains available if you need assistance.'
                : 'Until the correct PIN is verified, your account remains frozen. Once verified, the held withdrawal is cancelled and your balance remains unchanged.'}
            </span>
          </div>

          <div className={`grid gap-3 ${isAdminActionHold || isLiquidatedAccount ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {freezeState.reason === 'withdrawal_security_pin' ? (
              <Button
                onClick={handleUnlock}
                disabled={isSubmitting}
                className="h-12 bg-gradient-to-r from-[#d92d20] to-[#b42318] hover:from-[#e5483b] hover:to-[#c74235] text-white"
              >
                {isSubmitting ? 'Verifying PIN...' : 'Verify & Unfreeze'}
              </Button>
            ) : null}
            <Button
              onClick={handleOpenSupport}
              variant="outline"
              className="h-12 border-white/15 text-white bg-white/5 hover:bg-white/10"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {freezeState.reason === 'withdrawal_security_pin' ? 'Get PIN From Support' : 'Contact Support'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
