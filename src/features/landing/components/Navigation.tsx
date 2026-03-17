import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Logo } from '../../../app/components/Logo';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-black/8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Left Side - Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-xl shadow-lg shadow-[#00b388]/20 bg-gradient-to-br from-[#00b388] to-[#009670] flex items-center justify-center">
            <Logo className="w-6 h-6" innerClassName="text-white font-bold text-lg" />
          </div>
          <span className="text-xl font-semibold text-charcoal-900 hidden sm:block">Chimahub</span>
        </motion.div>

        {/* Right Side - Buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login')}
            className="px-4 sm:px-6 py-2.5 text-charcoal-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors hidden sm:block"
          >
            Log In
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/register')}
            className="px-4 sm:px-8 py-2.5 sm:py-3 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg shadow-lg shadow-[#00b388]/20 transition-all duration-300 flex items-center gap-2"
          >
            Open Account
            <ChevronRight className="w-4 h-4 hidden sm:block" />
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
};
