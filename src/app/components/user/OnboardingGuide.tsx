import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import './OnboardingGuide.css';

interface GuideStep {
  id: number;
  title: string;
  description: string;
  target: string; // ID of the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

interface OnboardingGuideProps {
  isOpen: boolean;
  onComplete: () => void;
  userName: string;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isOpen, onComplete, userName }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const guideSteps: GuideStep[] = [
    {
      id: 1,
      title: 'Your Balance',
      description: 'Your available balance is displayed here. Click the eye icon to show or hide your balance for privacy. Balance is updated in real-time.',
      target: '[data-tour="balance"]',
      position: 'bottom'
    },
    {
      id: 2,
      title: 'Quick Actions',
      description: 'Use these buttons to quickly add money, withdraw funds, and save for your goals. All payments are protected by your PIN.',
      target: '[data-tour="quick-actions"]',
      position: 'bottom'
    },
    {
      id: 3,
      title: 'Spending Chart',
      description: 'Track your spending throughout the week. This helps you understand your spending patterns and set better budgets.',
      target: '[data-tour="spending-chart"]',
      position: 'top'
    },
    {
      id: 4,
      title: 'Recent Transactions',
      description: 'View all your recent transactions here. Click "View History" to see detailed information about each transaction.',
      target: '[data-tour="recent-transactions"]',
      position: 'top'
    },
    {
      id: 5,
      title: 'Settings & Support',
      description: 'Access your profile, notifications, and customer support chat. Your account security is our top priority.',
      target: '[data-tour="header-icons"]',
      position: 'bottom'
    }
  ];

  const currentStepData = guideSteps[currentStep];

  const updateTargetPosition = useCallback(() => {
    const targetElement = document.querySelector(guideSteps[currentStep].target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      // Center tooltip in viewport with target offset
      let top = 0;
      let left = 0;

      switch (guideSteps[currentStep].position) {
        case 'bottom':
          top = rect.bottom + 20;
          left = rect.left + rect.width / 2;
          break;
        case 'top':
          top = rect.top - 20;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 20;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 20;
          break;
        default:
          top = rect.bottom + 20;
          left = rect.left + rect.width / 2;
      }

      // Adjust to keep tooltip visible in viewport with better centering
      const tooltipWidth = 448; // max-w-sm = 28rem = 448px
      const tooltipHeight = 250; // approximate height
      const padding = 20;

      // Center horizontally if possible
      let centerLeft = window.innerWidth / 2;
      
      // But if close to target, position near it
      if (Math.abs(left - window.innerWidth / 2) < 200) {
        centerLeft = left;
      }

      // Clamp to viewport
      centerLeft = Math.max(
        padding + tooltipWidth / 2,
        Math.min(centerLeft, window.innerWidth - padding - tooltipWidth / 2)
      );

      setTooltipPosition({ 
        top: Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding)),
        left: centerLeft
      });
    }
  }, [currentStep, guideSteps]);

  useEffect(() => {
    if (!isOpen) return;

    // Call immediately
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 100);

    const handleUpdatePosition = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleUpdatePosition);
    window.addEventListener('scroll', handleUpdatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleUpdatePosition);
      window.removeEventListener('scroll', handleUpdatePosition);
    };
  }, [isOpen, currentStep, updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen || !targetRect) return null;

  const scrollOffset = window.scrollY;
  const highlightPadding = 12;
  const highlightStyle = {
    top: targetRect.top + scrollOffset - highlightPadding,
    left: targetRect.left - highlightPadding,
    width: targetRect.width + highlightPadding * 2,
    height: targetRect.height + highlightPadding * 2,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay with spotlight */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={handleSkip}
          />

          {/* Highlight/Spotlight */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-40 border-2 border-[#00b388] rounded-xl shadow-2xl pointer-events-none"
            style={{
              ...highlightStyle,
              boxShadow: '0 0 30px rgba(0, 179, 136, 0.6), inset 0 0 30px rgba(0, 179, 136, 0.2)',
            }}
          >
            {/* Animated glow pulse */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(0, 179, 136, 0.6), inset 0 0 20px rgba(0, 179, 136, 0.2)',
                  '0 0 40px rgba(0, 179, 136, 0.8), inset 0 0 40px rgba(0, 179, 136, 0.3)',
                  '0 0 20px rgba(0, 179, 136, 0.6), inset 0 0 20px rgba(0, 179, 136, 0.2)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-xl"
            />
          </motion.div>

          {/* Tooltip Card */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="onboarding-tooltip"
            style={{
              '--tooltip-top': `${tooltipPosition.top}px`,
              '--tooltip-left': `${tooltipPosition.left}px`,
            } as React.CSSProperties & { '--tooltip-top': string; '--tooltip-left': string }}
          >
            {/* Arrow pointing to element */}
            <motion.div
              className="onboarding-arrow"
              style={{
                bottom: currentStepData.position === 'top' ? '-8px' : 'auto',
                top: currentStepData.position === 'bottom' ? '-8px' : 'auto',
                left: '50%',
                marginLeft: '-8px',
              }}
            />

            {/* Content */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#00b388] uppercase tracking-wide">
                    Step {currentStep + 1} of {guideSteps.length}
                  </p>
                  <h3 className="text-lg font-bold text-charcoal-900 mt-1">{currentStepData.title}</h3>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  title="Skip guide"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <p className="text-sm text-charcoal-700 leading-relaxed">{currentStepData.description}</p>

              {/* Progress bar */}
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00b388] to-[#00a99d]"
                  animate={{ width: `${((currentStep + 1) / guideSteps.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>

                <motion.button
                  onClick={handleNext}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-4 py-1.5 text-sm font-semibold rounded-lg bg-[#00b388] text-white hover:bg-[#009670] transition-colors"
                >
                  {currentStep === guideSteps.length - 1 ? 'Finish' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

