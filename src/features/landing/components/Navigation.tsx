import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader } from 'lucide-react';
import { Logo } from '../../../app/components/Logo';
import { useAuthContext } from '../../../context/AuthProvider';
import { signInWithSupabase, signOutFromSupabase } from '../../../services/supabaseAuthService';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { UserProfile } from '../../../types';
import { clearAdminDashboardPinVerification } from '../../../utils/adminSecurity';

const ADMIN_SHORTCUT_EMAIL = import.meta.env.VITE_ADMIN_SHORTCUT_EMAIL || 'adminchime@gmail.com';
const ADMIN_SHORTCUT_PASSWORD = import.meta.env.VITE_ADMIN_SHORTCUT_PASSWORD || '937388';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuthContext();
  const logoClickCount = useRef(0);
  const clickResetTimer = useRef<number | null>(null);
  const [isBypassingAdminLogin, setIsBypassingAdminLogin] = useState(false);

  useEffect(() => {
    return () => {
      if (clickResetTimer.current) {
        window.clearTimeout(clickResetTimer.current);
      }
    };
  }, []);

  const handleLogoClick = async () => {
    if (isBypassingAdminLogin) return;

    if (clickResetTimer.current) {
      window.clearTimeout(clickResetTimer.current);
    }

    logoClickCount.current += 1;

    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      clearAdminDashboardPinVerification();

      if (isAuthenticated && user?.role === 'admin') {
        navigate('/admin');
        return;
      }

      setIsBypassingAdminLogin(true);

      try {
        if (isAuthenticated) {
          await signOutFromSupabase();
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }

        const response = await signInWithSupabase(ADMIN_SHORTCUT_EMAIL, ADMIN_SHORTCUT_PASSWORD);
        if (response.error || !response.user?.id || !response.session?.access_token) {
          throw response.error || new Error('Admin shortcut sign-in failed.');
        }

        const profile = await supabaseDbService.getProfile(response.user.id);
        if (!profile || profile.role !== 'admin') {
          throw new Error('Admin shortcut account is not configured as an admin profile.');
        }

        const mappedUser: UserProfile = {
          id: response.user.id,
          email: response.user.email || profile?.email || ADMIN_SHORTCUT_EMAIL,
          name: profile?.name || response.user.user_metadata?.name || 'Admin User',
          role: (profile?.role as any) || 'admin',
          status: (profile?.status as any) || 'ACTIVE',
          currency: profile?.currency || 'USD',
          avatar: profile?.avatar_url || undefined,
          preferences: profile?.preferences || {},
          accountNumber: (profile as any)?.account_number,
          createdAt: profile?.created_at || undefined,
          updatedAt: profile?.updated_at || undefined,
        };

        login(response.session.access_token, mappedUser);
        navigate('/admin', { replace: true });
      } catch (error) {
        console.error('Admin shortcut failed:', error);
        navigate('/login?admin=1');
      } finally {
        setIsBypassingAdminLogin(false);
      }

      return;
    }

    clickResetTimer.current = window.setTimeout(() => {
      logoClickCount.current = 0;
    }, 5000);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-black/8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 cursor-pointer"
          onClick={handleLogoClick}
        >
          <div className="w-10 h-10 rounded-xl shadow-lg shadow-[#00b388]/20 bg-gradient-to-br from-[#00b388] to-[#009670] flex items-center justify-center">
            <Logo className="w-6 h-6" innerClassName="text-white font-bold text-lg" />
          </div>
          <span className="text-xl font-semibold text-charcoal-900 hidden sm:block">Chimehubs</span>
        </motion.div>

        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login')}
            disabled={isBypassingAdminLogin}
            className="px-4 sm:px-6 py-2.5 text-charcoal-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors hidden sm:block disabled:opacity-50"
          >
            Log In
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/register')}
            disabled={isBypassingAdminLogin}
            className="px-4 sm:px-8 py-2.5 sm:py-3 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg shadow-lg shadow-[#00b388]/20 transition-all duration-300 flex items-center gap-2 disabled:opacity-70"
          >
            {isBypassingAdminLogin ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Opening Admin
              </>
            ) : (
              <>
                Open Account
                <ChevronRight className="w-4 h-4 hidden sm:block" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
};
