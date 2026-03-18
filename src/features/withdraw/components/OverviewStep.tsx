import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '../../../app/components/ui/button';
import { fadeUpVariants } from '../../landing/animations';
import { WithdrawLimits } from '../types';

interface OverviewStepProps {
  limits: WithdrawLimits;
  onStartWithdraw: () => void;
  isLoading: boolean;
}

export const OverviewStep: React.FC<OverviewStepProps> = ({
  limits,
  onStartWithdraw,
  isLoading,
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-charcoal-900 mb-2">
          Cash Out Anytime
        </h1>
        <p className="text-charcoal-700">
          Transfer funds to your linked bank account in under one minute.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-charcoal-700 font-medium">Available Balance</span>
            <div className="p-2 bg-[#e6f9f4] rounded-lg">
              <DollarSign className="w-5 h-5 text-[#00b388]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-charcoal-900">
            ${limits.availableBalance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-sm text-charcoal-600 mt-2">Ready to withdraw</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-charcoal-700 font-medium">Today's Limit</span>
            <div className="p-2 bg-[#e6f9f4] rounded-lg">
              <Calendar className="w-5 h-5 text-[#00b388]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-charcoal-900">
            ${(limits.dailyLimit - limits.dailyWithdrawn).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-[#00b388] h-2 rounded-full transition-all duration-300"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, (limits.dailyWithdrawn / limits.dailyLimit) * 100)}%`,
              }}
              transition={{ duration: 0.6 }}
              role="progressbar"
              aria-label="Daily withdrawal limit progress"
              aria-valuenow={Math.round((limits.dailyWithdrawn / limits.dailyLimit) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-xs text-charcoal-600 mt-2">
            ${limits.dailyWithdrawn.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} withdrawn today
          </p>
        </motion.div>
      </div>

      <motion.div
        whileHover={{ y: -2 }}
        className={`rounded-lg p-4 flex items-start gap-3 ${
          limits.pendingWithdrawals > 0
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-blue-50 border border-blue-200'
        }`}
      >
        <div
          className={`p-1.5 rounded-lg flex-shrink-0 ${
            limits.pendingWithdrawals > 0 ? 'bg-amber-100' : 'bg-blue-100'
          }`}
        >
          <TrendingDown
            className={`w-5 h-5 ${
              limits.pendingWithdrawals > 0 ? 'text-amber-600' : 'text-blue-600'
            }`}
          />
        </div>
        <div>
          {limits.pendingWithdrawals > 0 ? (
            <>
              <p className="font-semibold text-amber-900">
                {limits.pendingWithdrawals} pending withdrawal{limits.pendingWithdrawals > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-amber-700">
                ${limits.pendingWithdrawalAmount.toFixed(2)} is currently pending verification.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-blue-900">No pending withdrawals</p>
              <p className="text-sm text-blue-700">
                Start a new withdrawal to transfer funds to your bank account.
              </p>
            </>
          )}
        </div>
      </motion.div>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={onStartWithdraw}
          disabled={isLoading || limits.availableBalance <= 0}
          className="w-full h-12 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg shadow-lg shadow-[#00b388]/20 transition-all"
        >
          {isLoading ? 'Processing...' : 'Start Withdrawal'}
        </Button>
      </motion.div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-charcoal-900 mb-2">Quick Facts</h3>
        <ul className="text-sm text-charcoal-700 space-y-1">
          <li>Transfers arrive in less than 1 minute</li>
          <li>No fees for any withdrawal or transfer</li>
          <li>24/7 access to your money</li>
          <li>All transactions are secure and encrypted</li>
        </ul>
      </div>
    </motion.div>
  );
};
