import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Copy, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface AccountCreationSuccessProps {
  fullName: string;
  routingNumber: string;
  accountNumber: string;
  onContinue: () => void;
  onClose?: () => void;
}

export default function AccountCreationSuccess({
  fullName,
  routingNumber,
  accountNumber,
  onContinue,
  onClose,
}: AccountCreationSuccessProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [showNumbers, setShowNumbers] = React.useState({
    routing: false,
    account: false,
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const maskNumber = (num: string, show: boolean): string => {
    if (show) return num;
    return '*'.repeat(num.length);
  };

  return (
    <div className="w-full min-h-full bg-white overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="min-h-full flex flex-col"
      >
        <div className="bg-gradient-to-r from-[#00b388] to-[#009670] px-6 py-8 sm:px-8 sm:py-10 text-white text-center relative">
          {onClose && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              <div className="w-6 h-6 flex items-center justify-center font-bold text-lg">x</div>
            </motion.button>
          )}

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
            className="mb-5"
          >
            <CheckCircle className="w-16 h-16 mx-auto" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold mb-2"
          >
            Welcome to Chimahub, {fullName}!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm opacity-95"
          >
            Your account has been created successfully.
          </motion.p>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <p className="text-green-900 text-sm text-center font-medium">
              Your $10 welcome bonus has been credited to your account.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Full Name</p>
              <p className="text-lg font-semibold text-gray-900">{fullName}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Routing Number</p>
                <button
                  onClick={() => setShowNumbers((prev) => ({ ...prev, routing: !prev.routing }))}
                  className="text-gray-400 hover:text-gray-600 transition"
                  title={showNumbers.routing ? 'Hide' : 'Show'}
                >
                  {showNumbers.routing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-gray-900 tracking-wider break-all">
                  {maskNumber(routingNumber, showNumbers.routing)}
                </p>
                <button
                  onClick={() => handleCopy(routingNumber, 'routing')}
                  className="text-[#00b388] hover:text-[#009670] transition flex items-center gap-1"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                  {copiedField === 'routing' && <span className="text-xs font-medium">Copied!</span>}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Account Number</p>
                <button
                  onClick={() => setShowNumbers((prev) => ({ ...prev, account: !prev.account }))}
                  className="text-gray-400 hover:text-gray-600 transition"
                  title={showNumbers.account ? 'Hide' : 'Show'}
                >
                  {showNumbers.account ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-gray-900 tracking-wider break-all">
                  {maskNumber(accountNumber, showNumbers.account)}
                </p>
                <button
                  onClick={() => handleCopy(accountNumber, 'account')}
                  className="text-[#00b388] hover:text-[#009670] transition flex items-center gap-1"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                  {copiedField === 'account' && <span className="text-xs font-medium">Copied!</span>}
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <p className="text-sm text-blue-900">
              <strong>Save Your Account Details:</strong> You will need your routing and account numbers for transfers.
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onContinue}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#00b388] to-[#009670] text-white font-semibold rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <p className="text-center text-xs text-gray-600 pt-1 pb-3">
            An email with your account details has been sent to your inbox.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
