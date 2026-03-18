import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../app/components/ui/button';
import { fadeUpVariants } from '../../landing/animations';
import { WithdrawalStatus } from '../types';
import { BankDetailsInput } from '../validation';

interface StatusStepProps {
  status: WithdrawalStatus;
  amount: number;
  transactionId: string | null;
  estimatedArrival: string | null;
  progress: number;
  method: 'linked-bank' | 'external-bank';
  bankDetails: BankDetailsInput | null;
  onOpenSupport?: () => void;
}

const maskAccountNumber = (accountNumber: string) => {
  if (!accountNumber) return 'N/A';
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
};

export const StatusStep: React.FC<StatusStepProps> = ({
  status,
  amount,
  transactionId,
  estimatedArrival,
  progress,
  method,
  bankDetails,
  onOpenSupport,
}) => {
  const navigate = useNavigate();

  if (status === 'processing') {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
        className="space-y-8 text-center"
      >
        <div className="mx-auto relative w-44 h-44 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-8 border-[#d9efe8]" />
          <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-[#00b388] animate-spin" />
          <div className="text-3xl font-bold text-charcoal-900">{Math.min(progress, 99)}%</div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-charcoal-900 mb-3">Processing Withdrawal</h1>
          <p className="text-lg text-charcoal-700 mb-2">
            We are securing and routing your transaction now.
          </p>
          <p className="text-sm text-charcoal-600 max-w-md mx-auto">
            This process should complete within 1 minute. Please keep this window open until status updates.
          </p>
        </div>
      </motion.div>
    );
  }

  if (status === 'pending') {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
        className="space-y-8 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex justify-center text-amber-600"
        >
          <Clock className="w-16 h-16" />
        </motion.div>

        <div>
          <h1 className="text-4xl font-bold text-charcoal-900 mb-3">Withdrawal Pending Verification</h1>
          <p className="text-xl text-charcoal-700 max-w-xl mx-auto">
            Your withdrawal was not completed yet and is currently pending an additional security check.
          </p>
          <p className="text-sm text-charcoal-600 mt-3 max-w-xl mx-auto">
            For your account safety, a 6-digit security PIN is required before release. Once verification is done, funds reflect within 1 minute.
          </p>
        </div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border border-gray-200 rounded-lg p-8 shadow-md max-w-xl mx-auto w-full text-left"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-charcoal-600 mb-1">Transaction ID</p>
              <p className="font-mono text-charcoal-900 break-all">{transactionId || 'Pending assignment'}</p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-charcoal-600 mb-1">Amount</p>
              <p className="font-semibold text-charcoal-900">${amount.toFixed(2)}</p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-charcoal-600 mb-1">Destination</p>
              <p className="font-semibold text-charcoal-900">
                {method === 'linked-bank' ? 'Linked Bank Account' : 'External Bank Account'}
              </p>
              <p className="text-sm text-charcoal-700 mt-1">
                {bankDetails?.bankName || 'N/A'} - {maskAccountNumber(bankDetails?.accountNumber || '')}
              </p>
            </div>
            {estimatedArrival ? (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-charcoal-600 mb-1">Post-verification Arrival</p>
                <p className="font-semibold text-charcoal-900">
                  Less than 1 minute (target: {new Date(estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </p>
              </div>
            ) : null}
          </div>
        </motion.div>

        <div className="flex flex-col gap-3 max-w-md mx-auto w-full pt-2">
          <Button
            onClick={onOpenSupport}
            className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg shadow-lg shadow-[#00b388]/20 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Get 6-Digit Security PIN
          </Button>

          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="w-full h-12 border-2 border-charcoal-300 text-charcoal-900 hover:bg-charcoal-50 font-semibold rounded-lg transition-all"
          >
            Back to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    );
  }

  if (status === 'completed') {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
        className="space-y-8 text-center"
      >
        <div className="flex justify-center text-green-600">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-charcoal-900 mb-3">Withdrawal Complete</h1>
          <p className="text-xl text-charcoal-700">Your withdrawal has been completed successfully.</p>
        </div>
        <Button
          onClick={() => navigate('/dashboard')}
          className="w-full max-w-sm mx-auto h-12 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg"
        >
          Back to Dashboard
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      className="space-y-8 text-center"
    >
      <div className="flex justify-center text-red-600">
        <AlertCircle className="w-16 h-16" />
      </div>
      <div>
        <h1 className="text-4xl font-bold text-charcoal-900 mb-3">Withdrawal Failed</h1>
        <p className="text-xl text-charcoal-700">We could not submit this withdrawal. Please try again.</p>
      </div>
      <Button
        onClick={() => navigate('/dashboard/withdraw')}
        className="w-full max-w-sm mx-auto h-12 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg"
      >
        Retry Withdrawal
      </Button>
    </motion.div>
  );
};
