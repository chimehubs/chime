import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Mail, Loader } from 'lucide-react';
import { signUpWithSupabase } from '../../../services/supabaseAuthService';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { getClient } from '../../../services/supabaseClient';
import GoogleSignupButton from './GoogleSignupButton';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import ENV from '../../../config/env';

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const client = getClient();
      if (!client) throw new Error('Supabase not configured');
      const redirectTo = ENV.VITE_SITE_URL || window.location.origin;
      const { error: oauthError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${redirectTo}/dashboard` }
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError('Failed to sign up with Google. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      const resp = await signUpWithSupabase(email, password, {});
      if (resp.error) throw resp.error;
      if (resp.user?.id) {
        const emailPrefix = email.split('@')[0];
        const displayName = emailPrefix.split('.')[0].charAt(0).toUpperCase() + emailPrefix.split('.')[0].slice(1);
        await supabaseDbService.upsertProfile({
          id: resp.user.id,
          email,
          name: displayName,
          status: 'UNREGISTERED',
          role: 'user'
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setError('Email signup failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 md:p-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXoL24HHFZY9sDPlej_aDDojZL8felyKfctw&s"
            alt="Chime Logo"
            className="w-10 h-10 rounded-xl shadow-lg shadow-[#00b388]/20 object-contain"
          />
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7Cw9mOE-9j4eqntzmCEZLobhu9blcCexiqQ&s"
            alt="Chime Next"
            className="h-8 object-contain"
          />
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

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-16 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <h2 className="text-3xl mb-2 font-semibold">Create your account</h2>
            <p className="text-muted-foreground">Join thousands of users managing their finances with Chime</p>
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

          {!showEmailForm ? (
            // Google/Email Buttons View
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <GoogleSignupButton
                onGoogleSignup={handleGoogleSignup}
                onEmailSignup={() => setShowEmailForm(true)}
                isLoading={isLoading}
              />

              {/* Login Link */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mt-6"
              >
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </motion.div>
            </motion.div>
          ) : (
            // Email Signup Form View
            <motion.form onSubmit={handleEmailSignup} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
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
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white"
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>

              <div className="space-y-3">
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

                <Button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmail('');
                    setPassword('');
                    setError('');
                  }}
                  variant="outline"
                  disabled={isLoading}
                  className="w-full h-12"
                >
                  Back
                </Button>
              </div>

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
          )}
        </motion.div>
      </div>
    </div>
  );
}
