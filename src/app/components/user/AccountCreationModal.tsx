import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AccountCreationForm, { AccountCreationFormData } from './AccountCreationForm';
import AccountCreationFlipCard from './AccountCreationFlipCard';
import { completeAccountCreation } from './accountCreationUtils';
import { useAuthContext } from '../../../context/AuthProvider';

interface AccountCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AccountCreationModal({ isOpen, onClose, onSuccess }: AccountCreationModalProps) {
  const { user, updateUser } = useAuthContext();
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
  const [progress, setProgress] = useState(0);
  const [successData, setSuccessData] = useState<{ fullName: string; routingNumber: string; accountNumber: string } | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setProgress(0);
      setSuccessData(null);
      setError('');
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    }
  }, [isOpen]);

  const handleSubmit = async (formData: AccountCreationFormData) => {
    if (!user?.id) return;
    setError('');
    setStep('loading');
    setProgress(0);

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          return 100;
        }
        return Math.min(100, prev + Math.random() * 18);
      });
    }, 800);

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(async () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setProgress(100);

      const result = await completeAccountCreation(user, formData);
      if (!result) {
        setError('Account creation failed. Please try again.');
        setStep('form');
        return;
      }

      updateUser({
        ...result.updatedUser,
        status: 'ACTIVE',
        name: result.updatedUser.name || result.fullName,
      });

      setSuccessData({
        fullName: result.fullName,
        routingNumber: result.routingNumber,
        accountNumber: result.accountNumber,
      });
      setStep('success');
    }, 8000);
  };

  const handleContinue = () => {
    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div className="w-full max-w-md h-[min(92vh,780px)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {step === 'form' && (
                <div className="flex-1 overflow-y-auto">
                  {error && (
                    <div className="px-6 pt-6">
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                        {error}
                      </div>
                    </div>
                  )}
                  <AccountCreationForm onSubmit={handleSubmit} isLoading={false} />
                </div>
              )}

              {(step === 'loading' || step === 'success') && (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <AccountCreationFlipCard
                    progress={progress}
                    successData={successData}
                    onContinue={handleContinue}
                    onClose={step === 'success' ? handleContinue : undefined}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
