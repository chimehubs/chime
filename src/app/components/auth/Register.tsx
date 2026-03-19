import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Mail, Loader, Lock, ShieldCheck } from 'lucide-react';
import { signUpWithSupabase } from '../../../services/supabaseAuthService';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import ENV from '../../../config/env';
import { Logo } from '../Logo';
import AuthBackgroundCarousel from './AuthBackgroundCarousel';

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      const redirectTo = ENV.VITE_SITE_URL || window.location.origin;
      const resp = await signUpWithSupabase(email, password, {}, `${redirectTo}/login`);
      if (resp.error) throw resp.error;

      if (!resp.session) {
        setVerifyMessage(`We have sent a verification link to ${email}. Please confirm your email to activate your account.`);
        setShowVerifyModal(true);
        setIsLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email signup failed. Please try again.';
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-[#050b0a]"
      style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
    >
      <AuthBackgroundCarousel />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden lg:flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl shadow-lg shadow-[#00b388]/25 bg-gradient-to-br from-[#00b388] to-[#009670] flex items-center justify-center">
              <Logo className="w-6 h-6" innerClassName="text-white font-bold text-lg" />
            </div>
            <span className="text-2xl font-semibold">Chimehubs</span>
          </div>

          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">International Banking</p>
            <h1 className="mt-4 text-4xl xl:text-5xl font-semibold leading-tight">
              Open a borderless account built for global life.
            </h1>
            <p className="mt-4 text-white/70 text-base leading-relaxed">
              Manage multi-currency balances, move funds across borders, and access secure customer care from one modern dashboard.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: 'Multi-currency wallets', value: '48+ currencies' },
                { label: 'Instant notifications', value: 'Real-time updates' },
                { label: 'Bank-grade security', value: '24/7 monitoring' },
                { label: 'Priority support', value: 'Customer care' }
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                >
                  <p className="text-xs text-white/60">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/50">Regulated infrastructure with encrypted data and secure customer operations.</p>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between p-6 lg:p-8 text-white">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Logo className="w-5 h-5" innerClassName="text-white font-bold text-base" />
              </div>
              <span className="text-lg font-semibold">Chimehubs</span>
            </div>
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Back to home"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Home</span>
            </motion.button>
          </div>

          <div className="flex-1 flex items-center justify-center px-6 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-full max-w-md"
            >
              <div className="mb-8 text-center text-white">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Open Account</p>
                <h2 className="mt-3 text-3xl font-semibold">Create your Chimehubs ID</h2>
                <p className="mt-2 text-white/70">Start with your email to access your private banking dashboard.</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
                >
                  {error}
                </motion.div>
              )}

              <motion.form
                onSubmit={handleEmailSignup}
                className="space-y-5 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.4)]"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <Input
                      id="email"
                      autoComplete="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#00b388]/30"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <Input
                      id="password"
                      autoComplete="new-password"
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-white/10 border border-white/20 pl-10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#00b388]/30"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <p className="text-xs text-white/50">At least 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-white/80">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <Input
                      id="confirm-password"
                      autoComplete="new-password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 bg-white/10 border border-white/20 pl-10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#00b388]/30"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#00A36C] to-[#008080] hover:from-[#00b377] hover:to-[#009191] text-white font-semibold rounded-xl transition-all shadow-lg shadow-black/40"
                >
                  {isLoading ? (
                    <motion.span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Creating Account...
                    </motion.span>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="flex items-center gap-2 text-xs text-white/60">
                  <ShieldCheck className="w-4 h-4" />
                  Your data is protected with encrypted storage and secure access.
                </div>
              </motion.form>

              <p className="mt-6 text-center text-sm text-white/70">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-[#00b388] hover:text-[#00d19c] font-semibold"
                >
                  Sign in
                </button>
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="bg-[#0c1211] border border-white/15 text-white">
          <DialogHeader>
            <DialogTitle>Verify your email</DialogTitle>
            <DialogDescription className="text-white/70">
              {verifyMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 sm:justify-start">
            <Button
              onClick={() => {
                setShowVerifyModal(false);
                navigate('/login');
              }}
              className="bg-[#00b388] hover:bg-[#009670] text-white"
            >
              Go to Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowVerifyModal(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


