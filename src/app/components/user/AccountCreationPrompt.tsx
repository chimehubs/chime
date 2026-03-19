import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, Zap, Globe, Landmark, Gift } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface AccountCreationPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCreation: () => void;
}

export default function AccountCreationPrompt({ isOpen, onClose, onStartCreation }: AccountCreationPromptProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleStartCreation = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onStartCreation();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          >
            <Card className="w-full max-w-md max-h-[90vh] bg-white shadow-2xl relative overflow-hidden flex flex-col">
              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </motion.button>

              {/* Content - Scrollable on mobile */}
              <div className="p-4 sm:p-6 md:p-8 pt-8 sm:pt-10 overflow-y-auto flex-1">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-4 sm:mb-6"
                >
                  <div className="inline-block p-2 sm:p-3 bg-emerald-50 rounded-full mb-2 sm:mb-4">
                    <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-charcoal-900 mb-1 sm:mb-2">
                    Create Your Chimehubs Account
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Get started with premium banking features and benefits
                  </p>
                </motion.div>

                {/* Reward Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg mt-1">
                      <Gift className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-900">$10 Welcome Bonus</p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Receive $10 instantly upon account creation
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Benefits List */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2 sm:space-y-3 mb-6 sm:mb-8"
                >
                  <h3 className="font-semibold text-charcoal-900 text-xs sm:text-sm uppercase tracking-wider mb-3 sm:mb-4">
                    You'll also get:
                  </h3>

                  {/* Benefit Items */}
                  <div className="space-y-2 sm:space-y-3">
                    {/* Fast Transactions */}
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg mt-0.5 shrink-0">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal-900 text-xs sm:text-sm">Lightning-Fast Transactions</p>
                        <p className="text-xs text-muted-foreground">
                          Send and receive money instantly
                        </p>
                      </div>
                    </motion.div>

                    {/* Global Transfer */}
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg mt-0.5 shrink-0">
                        <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal-900 text-xs sm:text-sm">Global Money Transfer</p>
                        <p className="text-xs text-muted-foreground">
                          Send money to 190+ countries
                        </p>
                      </div>
                    </motion.div>

                    {/* Checking & Savings */}
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg mt-0.5 shrink-0">
                        <Landmark className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal-900 text-xs sm:text-sm">Checking & Savings Accounts</p>
                        <p className="text-xs text-muted-foreground">
                          Dual accounts created automatically
                        </p>
                      </div>
                    </motion.div>

                    {/* Verified Badge */}
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg mt-0.5 shrink-0">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal-900 text-xs sm:text-sm">Instant Verification</p>
                        <p className="text-xs text-muted-foreground">
                          Complete your profile to unlock all features
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-2 sm:space-y-3 mb-3 sm:mb-4"
                >
                  <Button
                    onClick={handleStartCreation}
                    disabled={isAnimating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 sm:py-3 text-sm sm:text-base rounded-lg transition-all"
                  >
                    {isAnimating ? 'Creating Account...' : 'Create My Account'}
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full py-2 sm:py-3 text-sm sm:text-base rounded-lg"
                  >
                    Maybe Later
                  </Button>
                </motion.div>

                {/* Bottom text */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center text-xs text-muted-foreground mt-2 sm:mt-4"
                >
                  Takes less than 2 minutes - Free account upgrade
                </motion.p>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}




