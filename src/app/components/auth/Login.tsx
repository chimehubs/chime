import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail, Home, ShieldCheck, Loader } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { signInWithSupabase } from '../../../services/supabaseAuthService';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { Logo } from '../Logo';
import AuthBackgroundCarousel from './AuthBackgroundCarousel';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const resp = await signInWithSupabase(email, password);
      if (resp.error) throw resp.error;
      const userId = resp.user?.id;
      if (userId) {
        const profile = await supabaseDbService.getProfile(userId);
        if (profile?.role === 'admin') {
          navigate('/admin');
          return;
        }
      }
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
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
            <span className="text-2xl font-semibold">Chimahub</span>
          </div>

          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Private Banking</p>
            <h1 className="mt-4 text-4xl xl:text-5xl font-semibold leading-tight">
              Welcome back to your global finance hub.
            </h1>
            <p className="mt-4 text-white/70 text-base leading-relaxed">
              Sign in to view your balances, track withdrawals, and reach customer care instantly.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: 'Balances', value: 'Live updates' },
                { label: 'Security', value: 'Biometric ready' },
                { label: 'Withdrawals', value: 'Transparent status' },
                { label: 'Support', value: 'Customer care' }
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

          <p className="text-sm text-white/50">Secure access with encrypted sessions and private routing.</p>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between p-6 lg:p-8 text-white">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Logo className="w-5 h-5" innerClassName="text-white font-bold text-base" />
              </div>
              <span className="text-lg font-semibold">Chimahub</span>
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
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Secure Login</p>
                <h2 className="mt-3 text-3xl font-semibold">Welcome back</h2>
                <p className="mt-2 text-white/70">Sign in to continue to your account.</p>
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
                onSubmit={handleLogin}
                className="space-y-5 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.4)]"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <Input
                      id="email"
                      autoComplete="username"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#00b388]/30"
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
                      autoComplete="current-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#00b388]/30"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#00A36C] to-[#008080] hover:from-[#00b377] hover:to-[#009191] text-white shadow-lg shadow-black/40 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Signing In...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="flex items-center gap-2 text-xs text-white/60">
                  <ShieldCheck className="w-4 h-4" />
                  Verified devices are protected with continuous monitoring.
                </div>
              </motion.form>

              <div className="mt-6 text-center">
                <p className="text-sm text-white/70">
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigate('/register')}
                    className="text-[#00b388] hover:text-[#00d19c] transition-colors font-semibold"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
