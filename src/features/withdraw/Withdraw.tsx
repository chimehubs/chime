import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ImageAnnouncementBar from '../../app/components/user/ImageAnnouncementBar';
import { FLOW_ANNOUNCEMENT_SLIDES } from '../../app/components/user/announcementSlides';
import { DEFAULT_SECURITY_PIN, getAccountControlLimits, getActiveFreezeState } from '../../app/components/user/userAccountState';
import {
  OverviewStep,
  AmountStep,
  BankDetailsStep,
  ReviewStep,
  StatusStep,
} from './components';
import { WithdrawAmountInput, BankDetailsInput } from './validation';
import { WithdrawLimits, WithdrawalStatus, LinkedBankAccount } from './types';
import { supabaseDbService, type Profile, type Transaction } from '../../services/supabaseDbService';
import { useAuthContext } from '../../context/AuthProvider';
import { withdrawAmountSchema } from './validation';

type WithdrawStep =
  | 'overview'
  | 'amount'
  | 'bank-details'
  | 'review'
  | 'status';

const isWithdrawalTransaction = (tx: Transaction) => {
  if (tx.type !== 'debit') return false;
  const description = (tx.description || '').toLowerCase();
  return description.includes('withdraw') || Boolean(tx.metadata?.method);
};

const parseLinkedAccounts = (profile: Profile | null): LinkedBankAccount[] => {
  const raw = profile?.preferences?.linkedBankAccounts;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => ({
      id: String(item?.id || ''),
      accountName: String(item?.accountName || ''),
      accountNumber: String(item?.accountNumber || ''),
      bankName: String(item?.bankName || ''),
      createdAt: item?.createdAt ? String(item.createdAt) : undefined,
    }))
    .filter((item) => item.id && item.accountName && item.accountNumber && item.bankName);
};

export const Withdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthContext();

  const [step, setStep] = useState<WithdrawStep>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [limits, setLimits] = useState<WithdrawLimits | null>(null);

  const [amount, setAmount] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<'linked-bank' | 'external-bank'>('external-bank');
  const [selectedLinkedAccountId, setSelectedLinkedAccountId] = useState<string | null>(null);
  const [linkedBankAccounts, setLinkedBankAccounts] = useState<LinkedBankAccount[]>([]);
  const [selectedLinkedAccount, setSelectedLinkedAccount] = useState<LinkedBankAccount | null>(null);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});

  const [bankDetails, setBankDetails] = useState<BankDetailsInput | null>(null);
  const [fee, setFee] = useState(0);
  const [status, setStatus] = useState<WithdrawalStatus | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        setIsLoading(true);
        if (!user?.id) {
          setError('Please sign in to continue');
          return;
        }

        const [account, transactions, profile] = await Promise.all([
          supabaseDbService.getAccountByUser(user.id),
          supabaseDbService.getTransactions(user.id, 500),
          supabaseDbService.getProfile(user.id),
        ]);

        if (!account) {
          setError('Account not found');
          return;
        }

        const completedTransactions = transactions.filter((t) => t.status === 'completed');
        const accountTransactions = completedTransactions.filter((t) => t.account_id === account.id);
        const balance = accountTransactions.reduce(
          (sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)),
          0,
        );

        const today = new Date().toDateString();
        const dailyWithdrawn = completedTransactions
          .filter((t) => t.account_id === account.id)
          .filter((t) => isWithdrawalTransaction(t))
          .filter((t) => t.created_at && new Date(t.created_at).toDateString() === today)
          .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

        const pendingWithdrawalTransactions = transactions
          .filter((t) => t.account_id === account.id)
          .filter((t) => t.status === 'pending')
          .filter((t) => isWithdrawalTransaction(t));

        const pendingWithdrawalAmount = pendingWithdrawalTransactions.reduce(
          (sum, t) => sum + Math.abs(Number(t.amount)),
          0,
        );

        const prefs = profile?.preferences || {};
        const accountControls = getAccountControlLimits(prefs);
        setLimits({
          availableBalance: balance,
          withdrawableBalance: balance,
          dailyLimit: accountControls.withdrawalLimit,
          dailyWithdrawn,
          pendingWithdrawals: pendingWithdrawalTransactions.length,
          pendingWithdrawalAmount,
        });
        setProfilePreferences(prefs);
        const parsedLinkedAccounts = parseLinkedAccounts(profile);
        setLinkedBankAccounts(parsedLinkedAccounts);

        const activeFreeze = getActiveFreezeState(prefs);
        if (activeFreeze?.reason === 'withdrawal_security_pin') {
          const selectedLinked =
            activeFreeze.selectedLinkedAccountId
              ? parsedLinkedAccounts.find((item) => item.id === activeFreeze.selectedLinkedAccountId) || null
              : null;

          setAmount(Number(activeFreeze.amount || 0));
          setSelectedMethod(activeFreeze.method === 'linked-bank' ? 'linked-bank' : 'external-bank');
          setSelectedLinkedAccountId(activeFreeze.selectedLinkedAccountId || null);
          setSelectedLinkedAccount(selectedLinked);
          setBankDetails({
            accountName: activeFreeze.accountName || selectedLinked?.accountName || '',
            accountNumber: activeFreeze.accountNumber || selectedLinked?.accountNumber || '',
            bankName: activeFreeze.bankName || selectedLinked?.bankName || '',
            remark: activeFreeze.remark || '',
            saveAsDefault: false,
          });
          setTransactionId(activeFreeze.pendingWithdrawalId);
          setEstimatedArrival(activeFreeze.estimatedArrival || new Date(Date.now() + 60 * 1000).toISOString());
          setProgress(99);
          setStatus('pending');
          setStep('status');
        }
      } catch (err) {
        setError('Failed to load account limits');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLimits();
  }, [user?.id]);

  useEffect(() => {
    if (step !== 'status' || status !== 'processing') return;

    setProgress(1);
    const startedAt = Date.now();
    const durationMs = 10000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(99, Math.floor((elapsed / durationMs) * 99) + 1);
      setProgress(nextProgress);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setProgress(99);
        setStatus('pending');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [step, status]);

  const handleStartWithdraw = () => {
    setStep('amount');
    setError(null);
  };

  const handleAmountSubmit = async (data: WithdrawAmountInput) => {
    try {
      setIsLoading(true);
      setError(null);

      const parsed = withdrawAmountSchema.safeParse(data);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message || 'Validation failed');
        return;
      }

      if (limits && data.amount > limits.withdrawableBalance) {
        setError('Amount exceeds available balance');
        return;
      }

      setAmount(data.amount);
      setSelectedMethod(data.method);
      setSelectedLinkedAccountId(data.linkedAccountId || null);
      setFee(0);
      setEstimatedArrival(new Date(Date.now() + 60 * 1000).toISOString());

      if (data.method === 'linked-bank') {
        const linked = linkedBankAccounts.find((account) => account.id === data.linkedAccountId) || null;
        if (!linked) {
          setError('Please select a linked account');
          return;
        }
        setSelectedLinkedAccount(linked);
      } else {
        setSelectedLinkedAccount(null);
      }

      setStep('bank-details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate withdrawal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankDetailsSubmit = async (data: BankDetailsInput) => {
    setBankDetails(data);

    if (selectedMethod === 'external-bank' && data.saveAsDefault && user?.id) {
      const nextLinkedAccounts = [...linkedBankAccounts];
      const duplicate = nextLinkedAccounts.find(
        (item) =>
          item.accountNumber === data.accountNumber &&
          item.bankName.toLowerCase() === data.bankName.toLowerCase(),
      );

      if (!duplicate) {
        nextLinkedAccounts.push({
          id: `linked_${Date.now()}`,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          createdAt: new Date().toISOString(),
        });

        const nextPreferences = {
          ...profilePreferences,
          linkedBankAccounts: nextLinkedAccounts,
        };

        setLinkedBankAccounts(nextLinkedAccounts);
        setProfilePreferences(nextPreferences);

        await supabaseDbService.updateProfile(user.id, {
          preferences: nextPreferences,
        });
      }
    }

    setStep('review');
  };

  const handleReviewConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStep('status');
      setStatus('processing');

      if (!user?.id) {
        setStatus('failed');
        setError('Please sign in to continue');
        return;
      }

      if (!bankDetails) {
        setStatus('failed');
        setError('Destination details are missing');
        return;
      }

      const account = await supabaseDbService.getAccountByUser(user.id);
      if (!account) {
        setStatus('failed');
        setError('Account not found');
        return;
      }

      const estimatedArrivalIso = new Date(Date.now() + 60 * 1000).toISOString();
      const tx = await supabaseDbService.createTransaction({
        user_id: user.id,
        account_id: account.id,
        type: 'debit',
        amount,
        description: `Withdrawal to ${bankDetails.bankName}`,
        currency: account.currency,
        status: 'pending',
        metadata: {
          method: selectedMethod,
          linked_account_id: selectedMethod === 'linked-bank' ? selectedLinkedAccountId : null,
          bank_details: {
            account_name: bankDetails.accountName,
            account_number: bankDetails.accountNumber,
            bank_name: bankDetails.bankName,
            remark: bankDetails.remark || null,
          },
          requires_security_pin: true,
        },
      });

      if (!tx?.id) {
        setStatus('failed');
        setError('Failed to create withdrawal');
        return;
      }

      const nextPreferences = {
        ...profilePreferences,
        accountFreeze: {
          isFrozen: true,
          reason: 'withdrawal_security_pin',
          securityPin: DEFAULT_SECURITY_PIN,
          pendingWithdrawalId: tx.id,
          createdAt: new Date().toISOString(),
          amount,
          currency: account.currency,
          method: selectedMethod,
          selectedLinkedAccountId,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          accountName: bankDetails.accountName,
          remark: bankDetails.remark || '',
          estimatedArrival: estimatedArrivalIso,
        },
      };

      await supabaseDbService.createActivity({
        user_id: user.id,
        type: 'withdrawal',
        description: 'Withdrawal request submitted and pending verification',
        amount,
      });

      await supabaseDbService.createNotification({
        user_id: user.id,
        title: 'Withdrawal Pending Verification',
        message: 'Your withdrawal is currently pending additional verification. Contact customer support to continue.',
        type: 'pending',
        read: false,
        path: '/dashboard/withdraw',
      });

      setProfilePreferences(nextPreferences);
      await supabaseDbService.updateProfile(user.id, {
        status: 'SUSPENDED' as any,
        preferences: nextPreferences,
      });
      updateUser({
        status: 'SUSPENDED',
        preferences: nextPreferences,
      });
      setTransactionId(tx.id);
      setEstimatedArrival(estimatedArrivalIso);
      setLimits((prev) =>
        prev
          ? {
              ...prev,
              pendingWithdrawals: prev.pendingWithdrawals + 1,
              pendingWithdrawalAmount: prev.pendingWithdrawalAmount + amount,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process withdrawal');
      setStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSupportForPin = () => {
    navigate('/chat', {
      state: {
        from: '/dashboard/withdraw',
        prefillMessage:
          'Hello customer support, I need my unique 6-digit security PIN to continue my pending withdrawal.',
      },
    });
  };

  const handleBackClick = () => {
    switch (step) {
      case 'amount':
        setStep('overview');
        break;
      case 'bank-details':
        setStep('amount');
        break;
      case 'review':
        setStep('bank-details');
        break;
      default:
        navigate('/dashboard');
    }
  };

  if (!limits) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#e6f9f4] border-t-[#00b388] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-charcoal-700">Loading...</p>
        </div>
      </div>
    );
  }

  const stepNumber =
    step === 'overview' ? 1 : step === 'amount' ? 2 : step === 'bank-details' ? 3 : step === 'review' ? 4 : 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#e6f9f4]/20">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ x: 0 }}
            onClick={handleBackClick}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-charcoal-700" />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-charcoal-900">Withdraw Funds</h1>
            <p className="text-sm text-charcoal-600">Step {stepNumber} of 5</p>
          </div>
        </div>

        {step !== 'status' && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            <div className="flex gap-2 items-center justify-start">
              {['overview', 'amount', 'bank-details', 'review'].map((s, idx) => (
                <React.Fragment key={s}>
                  <motion.div
                    animate={{
                      backgroundColor:
                        s === step
                          ? '#00b388'
                          : ['overview', 'amount', 'bank-details', 'review'].indexOf(s) <
                              ['overview', 'amount', 'bank-details', 'review'].indexOf(step)
                            ? '#00b388'
                            : '#e5e7eb',
                    }}
                    className="w-3 h-3 rounded-full"
                  />
                  {idx < 3 && (
                    <motion.div
                      animate={{
                        backgroundColor:
                          ['overview', 'amount', 'bank-details', 'review'].indexOf(s) <
                          ['overview', 'amount', 'bank-details', 'review'].indexOf(step)
                            ? '#00b388'
                            : '#e5e7eb',
                      }}
                      className="h-1 flex-1"
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ImageAnnouncementBar items={FLOW_ANNOUNCEMENT_SLIDES} className="h-[92px]" />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-6"
        >
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900">{error}</div>
        </motion.div>
      )}

      <motion.div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {step === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <OverviewStep limits={limits} onStartWithdraw={handleStartWithdraw} isLoading={isLoading} />
            </motion.div>
          )}

          {step === 'amount' && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <AmountStep
                onNext={handleAmountSubmit}
                onBack={handleBackClick}
                isLoading={isLoading}
                availableBalance={limits.availableBalance}
                dailyLimit={Math.max(0, limits.dailyLimit - limits.dailyWithdrawn)}
                linkedAccounts={linkedBankAccounts}
              />
            </motion.div>
          )}

          {step === 'bank-details' && (
            <motion.div
              key="bank-details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <BankDetailsStep
                onNext={handleBankDetailsSubmit}
                onBack={handleBackClick}
                isLoading={isLoading}
                method={selectedMethod}
                selectedLinkedAccount={selectedLinkedAccount}
              />
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <ReviewStep
                amount={amount}
                method={selectedMethod}
                fee={fee}
                estimatedArrival={estimatedArrival || new Date(Date.now() + 60 * 1000).toISOString()}
                bankDetails={bankDetails}
                onConfirm={handleReviewConfirm}
                onBack={handleBackClick}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {step === 'status' && status && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <StatusStep
                status={status}
                amount={amount}
                transactionId={transactionId}
                estimatedArrival={estimatedArrival}
                progress={progress}
                method={selectedMethod}
                bankDetails={bankDetails}
                onOpenSupport={handleOpenSupportForPin}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Withdraw;
