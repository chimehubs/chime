import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../Logo';

interface AccountCreationLoadingProps {
  progress: number;
}

export default function AccountCreationLoading({ progress }: AccountCreationLoadingProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayProgress((prev) => Math.min(prev + Math.random() * 15, progress));
    }, 300);
    return () => clearInterval(timer);
  }, [progress]);

  useEffect(() => {
    if (progress >= 100) {
      setDisplayProgress(100);
    }
  }, [progress]);

  return (
    <div className="w-full h-full bg-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center w-full"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-8 flex justify-center"
        >
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#00b388] to-[#009670] flex items-center justify-center shadow-lg">
            <Logo className="w-16 h-16" innerClassName="text-white font-bold text-3xl" />
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Creating Your Account</h1>

        <p className="text-gray-600 text-sm mb-8">Please wait while your account is being created</p>

        <div className="mb-8 flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#00b388"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                animate={{ strokeDashoffset: `${2 * Math.PI * 45 * (1 - displayProgress / 100)}` }}
                transition={{ ease: 'easeOut', duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div className="text-center">
                <p className="text-3xl font-bold text-[#00b388]">{Math.round(displayProgress)}</p>
                <p className="text-xs text-gray-500">%</p>
              </motion.div>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-lg mb-8">
          <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
          >
            .
          </motion.span>
        </p>

        <div className="bg-gradient-to-br from-[#00b388]/10 to-[#009670]/10 rounded-lg p-5 border border-[#00b388]/20">
          <p className="text-xs text-gray-700 leading-relaxed">
            <span className="block mb-2">Securing your account</span>
            <span className="block mb-2">Generating account details</span>
            <span className="block">Applying your $10 welcome bonus</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
