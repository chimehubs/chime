import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Label } from '../../../app/components/ui/label';
import { Checkbox } from '../../../app/components/ui/checkbox';
import { fadeUpVariants } from '../../landing/animations';
import { bankDetailsSchema, BankDetailsInput } from '../validation';
import { LinkedBankAccount } from '../types';

interface BankDetailsStepProps {
  onNext: (data: BankDetailsInput) => void;
  onBack: () => void;
  isLoading: boolean;
  method: 'linked-bank' | 'external-bank';
  selectedLinkedAccount: LinkedBankAccount | null;
}

const BANK_NAMES = [
  'Chase',
  'Bank of America',
  'Wells Fargo',
  'Citibank',
  'Capital One',
  'TD Bank',
  'US Bank',
  'Other',
];

export const BankDetailsStep: React.FC<BankDetailsStepProps> = ({
  onNext,
  onBack,
  isLoading,
  method,
  selectedLinkedAccount,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BankDetailsInput>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      remark: '',
      saveAsDefault: false,
    },
  });

  useEffect(() => {
    if (method === 'linked-bank' && selectedLinkedAccount) {
      reset({
        accountName: selectedLinkedAccount.accountName,
        accountNumber: selectedLinkedAccount.accountNumber,
        bankName: selectedLinkedAccount.bankName,
        remark: '',
        saveAsDefault: false,
      });
      return;
    }

    reset({
      accountName: '',
      accountNumber: '',
      bankName: '',
      remark: '',
      saveAsDefault: false,
    });
  }, [method, selectedLinkedAccount, reset]);

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
          Bank Account Details
        </h1>
        <p className="text-charcoal-700">
          {method === 'linked-bank'
            ? 'Review your linked account details before continuing.'
            : 'Provide destination account details for this withdrawal.'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountName" className="text-base font-semibold">
          Account Name
        </Label>
        <Controller
          name="accountName"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="accountName"
              placeholder="John Doe"
              className="h-12"
              disabled={method === 'linked-bank'}
            />
          )}
        />
        {errors.accountName && (
          <div className="flex items-start gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errors.accountName.message}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountNumber" className="text-base font-semibold">
          Account Number
        </Label>
        <Controller
          name="accountNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="accountNumber"
              placeholder="123456789"
              type="text"
              className="h-12"
              disabled={method === 'linked-bank'}
            />
          )}
        />
        <p className="text-xs text-charcoal-600">
          Your account number is encrypted and secure.
        </p>
        {errors.accountNumber && (
          <div className="flex items-start gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errors.accountNumber.message}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankName" className="text-base font-semibold">
          Bank Name
        </Label>
        <Controller
          name="bankName"
          control={control}
          render={({ field }) => (
            method === 'linked-bank' ? (
              <Input {...field} id="bankName" className="h-12" disabled />
            ) : (
              <select
                {...field}
                id="bankName"
                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00b388]/20 focus:border-[#00b388] transition-all"
              >
                <option value="">Select your bank...</option>
                {BANK_NAMES.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            )
          )}
        />
        {errors.bankName && (
          <div className="flex items-start gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errors.bankName.message}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="remark" className="text-base font-semibold">
          Transaction Note (Optional)
        </Label>
        <Controller
          name="remark"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="remark"
              placeholder="e.g. Monthly transfer"
              className="h-12"
              maxLength={140}
            />
          )}
        />
        {errors.remark && (
          <div className="flex items-start gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errors.remark.message}</span>
          </div>
        )}
      </div>

      {method === 'external-bank' && (
        <div className="flex items-center gap-3">
          <Controller
            name="saveAsDefault"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="saveDefault"
                checked={field.value}
                onCheckedChange={field.onChange}
                className="w-5 h-5"
              />
            )}
          />
          <Label htmlFor="saveDefault" className="font-medium cursor-pointer">
            Save this account as linked account for future withdrawals
          </Label>
        </div>
      )}

      <motion.div
        whileHover={{ y: -2 }}
        className="bg-green-50 border border-green-200 rounded-lg p-4"
      >
        <p className="text-sm text-green-900">
          <strong>Your information is secure:</strong> We use bank-level encryption to protect your details.
        </p>
      </motion.div>

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
          disabled={isLoading}
          className="flex-1 h-12 bg-[#00b388] hover:bg-[#009670] text-white font-semibold rounded-lg shadow-lg shadow-[#00b388]/20 transition-all"
        >
          {isLoading ? 'Processing...' : 'Review & Confirm'}
        </Button>
      </div>
    </motion.form>
  );
};
