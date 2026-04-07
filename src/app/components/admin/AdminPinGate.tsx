import { useState } from 'react';
import { Lock, ShieldCheck, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Logo } from '../Logo';
import { useAuthContext } from '../../../context/AuthProvider';
import { isValidAdminDashboardPin, setAdminDashboardPinVerified } from '../../../utils/adminSecurity';

interface AdminPinGateProps {
  onVerified: () => void;
}

export default function AdminPinGate({ onVerified }: AdminPinGateProps) {
  const { logout } = useAuthContext();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!isValidAdminDashboardPin(pin)) {
      setError('Invalid security pin.');
      setIsSubmitting(false);
      return;
    }

    setAdminDashboardPinVerified();
    setPin('');
    setIsSubmitting(false);
    onVerified();
  };

  return (
    <div className="min-h-screen bg-[#050b0a] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full"
        >
          <Card className="border border-white/10 bg-white/10 p-7 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00b388] to-[#009670] shadow-lg shadow-[#00b388]/20">
                <Logo className="w-6 h-6" innerClassName="text-white font-bold text-lg" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Admin Access</p>
                <h1 className="mt-1 text-xl font-semibold text-white">Security Pin Required</h1>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#00b388]/15 text-[#5ef0c0]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Second-step verification</p>
                  <p className="mt-1 text-sm text-white/65">
                    Enter the admin security pin to display the dashboard.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="admin-pin" className="text-sm font-medium text-white/78">
                  Security Pin
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <Input
                    id="admin-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter 4-digit pin"
                    value={pin}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 4);
                      setPin(digitsOnly);
                      if (error) setError('');
                    }}
                    className="h-12 border-white/15 bg-white/10 pl-10 text-white placeholder:text-white/35 focus:ring-2 focus:ring-[#00b388]/40"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || pin.length !== 4}
                className="h-12 w-full bg-gradient-to-r from-[#00A36C] to-[#008080] text-white hover:from-[#00b377] hover:to-[#009191]"
              >
                {isSubmitting ? 'Verifying...' : 'Unlock Admin Dashboard'}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => void logout()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/72 transition-colors hover:bg-white/8 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
