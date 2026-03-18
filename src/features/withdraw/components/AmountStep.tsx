import React from 'react';
import { motion } from 'motion/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Info, PlusCircle } from 'lucide-react';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Label } from '../../../app/components/ui/label';
import { fadeUpVariants } from '../../landing/animations';
import { withdrawAmountSchema, WithdrawAmountInput } from '../validation';
import { LinkedBankAccount, WithdrawalMethod } from '../types';

interface AmountStepProps {
  onNext: (data: WithdrawAmountInput) => void;
  onBack: () => void;
  isLoading: boolean;
  availableBalance: number;
  dailyLimit: number;
  linkedAccounts: LinkedBankAccount[];
}

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 2000];

const withdrawalMethods: {
  value: WithdrawalMethod;
  label: string;
  description: string;
}[] = [
  {
    value: 'external-bank',
    label: 'External Bank',
    description: 'Enter destination bank details manually',
  },
  {
    value: 'linked-bank',
    label: 'Linked Bank Account',
    description: 'Use one of your previously linked accounts',
  },
];

export const AmountStep: React.FC<AmountStepProps> = ({
  onNext,
  onBack,
  isLoading,
  availableBalance,
  dailyLimit,
  linkedAccounts,
}) => {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WithdrawAmountInput>({
    resolver: zodResolver(withdrawAmountSchema),
    defaultValues: {
      amount: undefined,
      method: 'external-bank',
      linkedAccountId: '',
    },
  });

  const amount = watch('amount');
  const method = watch('method');

  return (
    <motion.form
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      onSubmit={handleSubmit(onNext)}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-charcoal-900 mb-2">
          How much do you want to withdraw?
        </h1>
        <p className="text-charcoal-700">
          Enter the amount and choose your destination account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-base font-semibold">
          Withdrawal Amount
        </Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-charcoal-900">
            $
          </span>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                step="0.01"
                className="pl-10 h-14 text-2xl font-bold"
                value={field.value ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? undefined : Number(value));
                }}
              />
            )}
          />
        </div>

        {errors.amount && (
          <div className="flex items-start gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errors.amount.message}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-charcoal-800">Quick Amounts</Label>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((quickAmount) => (
            <button
              key={quickAmount}
              type="button"
              onClick={() => setValue('amount', quickAmount, { shouldValidate: true, shouldDirty: true })}
              className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                amount === quickAmount
                  ? 'bg-[#00b388] text-white border-[#00b388]'
                  : 'bg-white text-charcoal-800 border-gray-300 hover:border-[#00b388]'
              }`}
            >
              ${quickAmount}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        whileHover={{ y: -2 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-blue-900 mb-1">Limits & Info</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>Available: ${availableBalance.toFixed(2)}</li>
            <li>Daily Limit: ${dailyLimit.toFixed(2)}</li>
            {amount && amount > 0 && (
              <li className="text-blue-600 font-medium">
                You are withdrawing ${amount.toFixed(2)}
              </li>
            )}
          </ul>
        </div>
      </motion.div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Where to withdraw?</Label>

        {withdrawalMethods.map((option) => (
          <Controller
            key={option.value}
            name="method"
            control={control}
            render={({ field }) => (
              <motion.label
                whileHover={{ scale: 1.01 }}
                className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all"
                style={{
                  borderColor: field.value === option.value ? '#00b388' : '#e5e7eb',
                  backgroundColor: field.value === option.value ? '#e6f9f4' : 'white',
                }}
              >
                <input
                  type="radio"
                  value={option.value}
                  checked={field.value === option.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-5 h-5 mt-1 flex-shrink-0"
                  aria-label={`Select ${option.label}`}
                />
                <div className="ml-4">
                  <p className="font-semibold text-charcoal-900">{option.label}</p>
                  <p className="text-sm text-charcoal-600">{option.description}</p>
                </div>
              </motion.label>
            )}
          />
        ))}
      </div>

      {method === 'linked-bank' && (
        <div className="space-y-2">
          <Label htmlFor="linkedAccountId" className="text-base font-semibold">
            Select Linked Account
          </Label>

          {linkedAccounts.length > 0 ? (
            <Controller
              name="linkedAccountId"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="linkedAccountId"
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00b388]/20 focus:border-[#00b388] transition-all"
                >
                  <option value="">Choose a linked account...</option>
                  {linkedAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - {account.accountName} ({account.accountNumber.slice(-4).padStart(account.accountNumber.length, '*')})
                    </option>
                  ))}
                </select>
              )}
            />
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm text-amber-900 mb-3">
                No linked account found. Link a new bank account to continue.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setValue('method', 'external-bank', { shouldValidate: true, shouldDirty: true })}
                className="border-amber-400 text-amber-800 hover:bg-amber-100"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Link New Account
              </Button>
            </div>
          )}

          {errors.linkedAccountId && (
            <div className="flex items-start gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errors.linkedAccountId.message}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 pt-6">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="flex-1 h-12 border-2 border-charcoal-300 text-charcoal-900 hover:bg-charcoal-50 rounded-lg font-semibold transition-all"
        >
          Back
        </Button>

        <Button
          type="submit"
          disabled={isLoading || !amount || amount <= 0}
          className="flex-1 h-12 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg shadow-lg shadow-[#00b388]/20 transition-all"
        >
          {isLoading ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </motion.form>
  );
};
