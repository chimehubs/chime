import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../../app/components/ui/button';
import { fadeUpVariants } from '../../landing/animations';
import { WithdrawalMethod } from '../types';
import { BankDetailsInput } from '../validation';

interface ReviewStepProps {
  amount: number;
  method: WithdrawalMethod;
  fee: number;
  estimatedArrival: string;
  bankDetails: BankDetailsInput | null;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const methodLabels: Record<WithdrawalMethod, string> = {
  'linked-bank': 'Linked Bank Account',
  'external-bank': 'External Bank Account',
};

const maskAccountNumber = (accountNumber: string) => {
  if (!accountNumber) return 'N/A';
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
};

export const ReviewStep: React.FC<ReviewStepProps> = ({
  amount,
  method,
  fee,
  estimatedArrival,
  bankDetails,
  onConfirm,
  onBack,
  isLoading,
}) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const total = amount + fee;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-charcoal-900 mb-2">
          Review Your Withdrawal
        </h1>
        <p className="text-charcoal-700">
          Confirm the details below before proceeding.
        </p>
      </div>

      <motion.div
        whileHover={{ y: -4 }}
        className="bg-gradient-to-br from-white to-[#e6f9f4]/30 border-2 border-[#00b388]/30 rounded-lg p-8 shadow-md"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-6 border-b border-gray-200">
            <span className="text-charcoal-700 font-medium">Withdrawal Amount</span>
            <span className="text-3xl font-bold text-charcoal-900">
              ${amount.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center pb-6 border-b border-gray-200">
            <span className="text-charcoal-700 font-medium">Processing Fee</span>
            <span className="text-xl font-semibold text-green-600">
              ${fee.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center pb-6 border-b-2 border-[#00b388]/30 bg-[#e6f9f4]/50 -m-8 mb-0 px-8 py-6">
            <span className="text-charcoal-900 font-bold">Total</span>
            <span className="text-2xl font-bold text-charcoal-900">
              ${total.toFixed(2)}
            </span>
          </div>

          <div className="pt-4">
            <p className="text-charcoal-700 font-medium mb-2">Destination</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-[#00b388]" />
              <div>
                <p className="font-semibold text-charcoal-900">{methodLabels[method]}</p>
                <p className="text-sm text-charcoal-600">Funds are routed to the recipient bank details below</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-charcoal-600">Bank Name</span>
                <span className="font-medium text-charcoal-900 text-right">{bankDetails?.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-charcoal-600">Account Name</span>
                <span className="font-medium text-charcoal-900 text-right">{bankDetails?.accountName || 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-charcoal-600">Account Number</span>
                <span className="font-mono text-charcoal-900 text-right">{maskAccountNumber(bankDetails?.accountNumber || '')}</span>
              </div>
              {bankDetails?.remark ? (
                <div className="flex justify-between gap-3">
                  <span className="text-charcoal-600">Remark</span>
                  <span className="text-charcoal-900 text-right">{bankDetails.remark}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        whileHover={{ y: -2 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3"
      >
        <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-blue-900">Estimated Arrival</p>
          <p className="text-sm text-blue-700">
            Withdrawal confirmation is instant, and destination credit reflects in less than 1 minute.
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Requested at {new Date(estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </motion.div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="terms"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="w-5 h-5 mt-1 accent-[#00b388]"
        />
        <label htmlFor="terms" className="text-sm text-charcoal-700">
          I confirm this withdrawal request and verify that the recipient bank details are correct.
        </label>
      </div>

      <motion.div
        whileHover={{ y: -2 }}
        className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3"
      >
        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-900">
            Your withdrawal is protected by encryption and real-time risk monitoring.
          </p>
        </div>
      </motion.div>

      <div className="flex gap-4 pt-6">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 h-12 border-2 border-charcoal-300 text-charcoal-900 hover:bg-charcoal-50 rounded-lg font-semibold transition-all"
        >
          Back
        </Button>

        <Button
          onClick={onConfirm}
          disabled={isLoading || !agreedToTerms}
          className="flex-1 h-12 bg-[#00b388] hover:bg-[#009670] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-[#00b388]/20 transition-all"
        >
          {isLoading ? 'Processing...' : 'Confirm Withdrawal'}
        </Button>
      </div>
    </motion.div>
  );
};
