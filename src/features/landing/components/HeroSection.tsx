import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../app/components/ui/button';
import { fadeUpVariants, floatingAnimation } from '../animations';

const TypingHeading: React.FC<{ text: string }> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        setIsTypingComplete(true);
        clearInterval(typingInterval);
      }
    }, 80);

    return () => clearInterval(typingInterval);
  }, [text]);

  return (
    <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
      <motion.span
        animate={
          isTypingComplete
            ? {
                color: ['#1a1a1a', '#00b388', '#00b388', '#1a1a1a'],
              }
            : {}
        }
        transition={
          isTypingComplete
            ? {
                duration: 3,
                repeat: Infinity,
                repeatType: 'loop',
              }
            : {}
        }
        className="text-charcoal-900"
      >
        {displayedText}
      </motion.span>
      {!isTypingComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="ml-1 text-charcoal-900"
        >
          |
        </motion.span>
      )}
    </h1>
  );
};

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="min-h-screen bg-white pt-20 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUpVariants}
            className="flex flex-col justify-center"
          >
            <TypingHeading text="Banking that moves at your speed." />

            <p className="text-xl text-charcoal-700 mb-8 leading-relaxed">
              Experience enterprise-grade banking built for modern financial needs. No hidden fees. No complexity. Just intelligent money management.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg shadow-lg shadow-[#00b388]/20 transition-all duration-300"
              >
                Open Account
              </motion.button>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                onClick={() => navigate('/login')}
                className="px-8 py-4 border-2 border-[#00b388] text-[#00b388] hover:bg-[#00b388]/5 font-semibold rounded-lg transition-all duration-300"
              >
                Log In
              </motion.button>
            </div>
          </motion.div>

          {/* Right Side - App Mockup */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUpVariants}
            transition={{ delay: 0.2 }}
            className="relative h-full min-h-[400px] sm:min-h-[500px] flex items-center justify-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="flex items-center justify-center"
            >
              <img
                src="https://images.ctfassets.net/ao7gxs2zk32d/1h778TM1vimjL0M8ieOI2O/ce9c71241b19d566aea1d6f42bad0cf5/hero-base-asset.png"
                alt="Banking App Interface"
                className="max-w-full h-auto max-h-[500px] object-contain"
              />
            </motion.div>

            {/* Decorative Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-32 -right-24 w-48 h-48 bg-[#00b388]/15 rounded-full blur-2xl" />
              <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[#00b388]/10 rounded-full blur-2xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
