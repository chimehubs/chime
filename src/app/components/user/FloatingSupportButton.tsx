import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Headset, X } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingSupportButtonProps {
  userId?: string;
  darkMode?: boolean;
  className?: string;
}

export default function FloatingSupportButton({
  userId,
  darkMode = false,
  className = '',
}: FloatingSupportButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [userId]);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 },
        y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
      }}
      className={`fixed bottom-24 left-4 z-[24] sm:bottom-8 sm:left-8 ${className}`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/85"
          aria-label="Close support shortcut"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/chat', { state: { from: location.pathname } })}
          className={`flex items-center gap-3 rounded-full border px-4 py-3 shadow-[0_18px_50px_rgba(0,163,122,0.24)] backdrop-blur-xl ${
            darkMode
              ? 'border-white/10 bg-[linear-gradient(135deg,rgba(7,20,18,0.94),rgba(6,65,53,0.78))] text-white'
              : 'border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(225,247,239,0.92))] text-[#0f3b33]'
          }`}
          aria-label="Open customer support"
          title="Open customer support"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00A36C,#008080)] text-white shadow-[0_10px_24px_rgba(0,163,108,0.28)]">
            <Headset className="h-5 w-5" />
          </span>
          <span className="pr-1 text-left">
            <span className="block text-xs uppercase tracking-[0.18em] text-[#7ef0ca]">Support</span>
            <span className="block text-sm font-semibold">Customer Care</span>
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
