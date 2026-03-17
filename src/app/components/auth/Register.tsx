import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Mail, Loader, Lock } from 'lucide-react';
import { signUpWithSupabase } from '../../../services/supabaseAuthService';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import ENV from '../../../config/env';
import { Logo } from '../Logo';

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
        setError('Account created. Please check your email to confirm your account, then log in.');
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
    <div className="min-h-screen bg-background flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 md:p-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl shadow-lg shadow-[#00b388]/20 bg-gradient-to-br from-[#00b388] to-[#009670] flex items-center justify-center">
            <Logo className="w-6 h-6" innerClassName="text-white font-bold text-lg" />
          </div>
          <span className="text-xl font-semibold text-charcoal-900">Chimahub</span>
        </div>
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-charcoal-700 hover:bg-gray-100 transition-colors"
          title="Back to home"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Home</span>
        </motion.button>
      </motion.div>

      <div className="flex-1 flex items-center justify-center px-6 pb-16 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <h2 className="text-3xl mb-2 font-semibold">Create your account</h2>
            <p className="text-muted-foreground">Sign up with your email and password</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.form onSubmit={handleEmailSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  autoComplete="new-password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  autoComplete="new-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 bg-white pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
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

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Sign in
              </button>
            </p>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}

