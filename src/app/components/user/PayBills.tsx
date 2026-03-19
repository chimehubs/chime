import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CircleCheck,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Tv,
  UtilityPole,
  WalletCards,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { formatCurrency } from '../ui/utils';
import UserFeaturePageShell from './UserFeaturePageShell';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { BillPaymentRecord, calculateCompletedBalance, getAccountControlLimits, getPreferenceArray } from './userAccountState';

const BILL_CATEGORIES = ['Electricity', 'Internet', 'Water', 'Cable TV', 'Insurance', 'School Fees'];
const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 1500];

const CATEGORY_ICON_MAP: Record<string, typeof Zap> = {
  Electricity: Zap,
  Internet: UtilityPole,
  Water: UtilityPole,
  'Cable TV': Tv,
  Insurance: ShieldCheck,
  'School Fees': CreditCard,
};

export default function PayBills() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});
  const [payments, setPayments] = useState<BillPaymentRecord[]>([]);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');
  const [transactionLimit, setTransactionLimit] = useState(5000);

  const [category, setCategory] = useState(BILL_CATEGORIES[0]);
  const [payeeName, setPayeeName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [profile, transactions] = await Promise.all([
        supabaseDbService.getProfile(user.id),
        supabaseDbService.getTransactions(user.id, 1000),
      ]);

      const preferences = profile?.preferences || {};
      setProfilePreferences(preferences);
      setDarkMode(Boolean(preferences.darkMode));
      setPayments(getPreferenceArray<BillPaymentRecord>(preferences, 'billPayments'));
      setBalance(calculateCompletedBalance(transactions));
      setCurrency(profile?.currency || user.currency || 'USD');
      setTransactionLimit(getAccountControlLimits(preferences).transactionLimit);
      setLoading(false);
    };

    loadData();
  }, [user?.id, user?.currency]);

  const amountNumber = useMemo(() => Number(amount || 0), [amount]);
  const canSubmit =
    !!user?.id &&
    user.status === 'ACTIVE' &&
    payeeName.trim().length > 1 &&
    accountNumber.trim().length >= 6 &&
    reference.trim().length > 1 &&
    amountNumber > 0 &&
    amountNumber <= balance;

  const shellCardClass = darkMode
    ? 'border-white/10 bg-white/5 text-white backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.28)]'
    : 'border-slate-200/80 bg-white/80 text-slate-950 backdrop-blur-xl shadow-[0_24px_60px_rgba(15,23,42,0.12)]';
  const innerCardClass = darkMode
    ? 'border-white/10 bg-black/20'
    : 'border-slate-200/80 bg-white/90';
  const mutedTextClass = darkMode ? 'text-slate-300' : 'text-slate-600';

  const persistPayments = async (nextPayments: BillPaymentRecord[]) => {
    if (!user?.id) return;
    const nextPreferences = { ...profilePreferences, billPayments: nextPayments };
    setProfilePreferences(nextPreferences);
    await supabaseDbService.updateProfile(user.id, { preferences: nextPreferences });
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (user.status !== 'ACTIVE') {
      setError('Activate your account before paying bills.');
      return;
    }
    if (!canSubmit) {
      setError('Provide valid bill details and ensure your balance is enough.');
      return;
    }
    if (amountNumber > transactionLimit) {
      setError(`This payment exceeds your transaction limit of ${formatCurrency(transactionLimit, currency).replace(/^US\$/, '$')}.`);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    setProcessingMessage('Connecting to biller network...');

    try {
      const account = await supabaseDbService.getAccountByUser(user.id);
      if (!account) {
        setError('No active account was found for bill payment.');
        return;
      }

      const paymentAmount = Number(amountNumber.toFixed(2));
      const createdAt = new Date().toISOString();
      const paymentRecord: BillPaymentRecord = {
        id: `bill_${Date.now()}`,
        category,
        payeeName: payeeName.trim(),
        accountNumber: accountNumber.trim(),
        amount: paymentAmount,
        dueDate: dueDate || undefined,
        note: note.trim() || undefined,
        createdAt,
        status: 'failed',
      };

      await new Promise((resolve) => window.setTimeout(resolve, 5000));

      const transaction = await supabaseDbService.createTransaction({
        user_id: user.id,
        account_id: account.id,
        type: 'debit',
        amount: paymentAmount,
        description: `Bill payment to ${paymentRecord.payeeName}`,
        currency: account.currency,
        status: 'failed',
        metadata: {
          feature: 'pay_bills',
          category: paymentRecord.category,
          payee_name: paymentRecord.payeeName,
          account_number: paymentRecord.accountNumber,
          reference: reference.trim(),
          due_date: paymentRecord.dueDate || null,
          note: paymentRecord.note || null,
        },
      });

      if (!transaction) {
        setError('Bill payment failed. Please try again.');
        return;
      }

      await Promise.all([
        supabaseDbService.createActivity({
          user_id: user.id,
          type: 'pay_bills',
          description: `Bill payment failed for ${paymentRecord.payeeName}`,
          amount: paymentAmount,
        }),
        supabaseDbService.createNotification({
          user_id: user.id,
          title: 'Bill Payment Failed',
          message: `Bill payment failed for ${paymentRecord.payeeName}. Please try again.`,
          type: 'error',
          read: false,
          path: '/activity',
        }),
      ]);

      const nextPayments = [paymentRecord, ...payments].slice(0, 20);
      setPayments(nextPayments);
      await persistPayments(nextPayments);
      setError('Bill payment failed. Please try again.');
    } finally {
      setProcessingMessage('');
      setSubmitting(false);
    }
  };

  const totalPaid = payments
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const upcomingBills = payments.filter((payment) => payment.dueDate && new Date(payment.dueDate) >= new Date()).length;
  const CategoryIcon = CATEGORY_ICON_MAP[category] || ReceiptText;

  const summaryCards = [
    {
      label: 'Available Balance',
      value: formatCurrency(balance, currency).replace(/^US\$/, '$'),
      detail: 'Ready for scheduled bill payments',
      icon: WalletCards,
      accent: 'from-emerald-500/30 via-teal-500/20 to-cyan-500/20',
      iconClass: 'text-emerald-100',
    },
    {
      label: 'Total Paid',
      value: formatCurrency(totalPaid, currency).replace(/^US\$/, '$'),
      detail: 'All recorded bill settlements',
      icon: ReceiptText,
      accent: 'from-cyan-500/35 via-sky-500/20 to-emerald-400/20',
      iconClass: 'text-cyan-100',
    },
    {
      label: 'Upcoming Entries',
      value: String(upcomingBills),
      detail: 'Saved with future due dates',
      icon: ShieldCheck,
      accent: 'from-violet-500/30 via-fuchsia-500/15 to-cyan-400/15',
      iconClass: 'text-fuchsia-100',
    },
    {
      label: 'Current Category',
      value: category,
      detail: 'Payment profile in focus',
      icon: CategoryIcon,
      accent: 'from-amber-400/30 via-orange-400/20 to-yellow-300/20',
      iconClass: 'text-amber-100',
    },
  ];

  return (
    <UserFeaturePageShell
      title="Pay Bills"
      description="Settle utilities, subscriptions, school fees, and household bills from your available balance."
      darkMode={darkMode}
      icon={<ReceiptText className="h-5 w-5 text-[#00a37a]" />}
      onBack={() => navigate('/dashboard')}
    >
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.22)] sm:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(12,31,61,0.95),rgba(6,95,70,0.92)_52%,rgba(14,165,233,0.82))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_26%)]" />
        <motion.div
          className="absolute right-6 top-6 rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl"
          animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ReceiptText className="h-10 w-10 text-white/90" />
        </motion.div>
        <motion.div
          className="absolute bottom-6 right-24 rounded-[24px] border border-white/10 bg-white/10 p-3 backdrop-blur-xl"
          animate={{ y: [0, 8, 0], x: [0, 4, 0] }}
          transition={{ duration: 6.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Zap className="h-6 w-6 text-[#c7fef2]" />
        </motion.div>

        <div className="relative max-w-3xl text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-[#7ef5cf]" />
            Payment Desk
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Handle bill payments from one controlled workflow.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/78 sm:text-base">
            Pay utilities, subscriptions, insurance, and school fees from your Chimehubs balance with a clear record of
            payee details, references, and completed settlements.
          </p>
        </div>
      </section>

      {loading ? (
        <Card className={`p-8 text-center ${shellCardClass}`}>
          <p className={mutedTextClass}>Loading bill payment workspace...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.label}
                  className={`relative overflow-hidden border-0 p-5 text-white shadow-[0_24px_50px_rgba(0,0,0,0.18)] ${darkMode ? 'bg-[#071b18]' : 'bg-slate-950'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%)]" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/70">{item.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
                      <p className="mt-2 text-xs text-white/75">{item.detail}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
                      <Icon className={`h-5 w-5 ${item.iconClass}`} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className={`overflow-hidden p-0 ${shellCardClass}`}>
              <div className="border-b border-white/10 bg-gradient-to-r from-[#00a37a]/18 via-[#10b981]/12 to-[#0ea5e9]/18 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-white/80 uppercase">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#7ef5cf]" />
                      Payment Setup
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">Complete the payee details before posting the payment.</h2>
                    <p className={`max-w-2xl text-sm ${mutedTextClass}`}>
                      Most supported billers post the payment the same day once the transaction is accepted and your balance is sufficient.
                    </p>
                  </div>
                  <div className={`rounded-3xl border px-4 py-3 text-sm ${innerCardClass}`}>
                    <p className="font-semibold">Available to spend</p>
                    <p className={`mt-1 text-xs ${mutedTextClass}`}>{formatCurrency(balance, currency).replace(/^US\$/, '$')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="category" className="mb-2 block">Bill Category</Label>
                    <select
                      id="category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className={`h-12 w-full rounded-xl border px-3 ${darkMode ? 'border-white/10 bg-black/20 text-white' : 'border-slate-200 bg-white/90'}`}
                    >
                      {BILL_CATEGORIES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="amount" className="mb-2 block">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payee" className="mb-2 block">Biller Name</Label>
                    <Input
                      id="payee"
                      value={payeeName}
                      onChange={(event) => setPayeeName(event.target.value)}
                      placeholder="Comcast, Duke Energy, State Farm"
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="account" className="mb-2 block">Customer / Account Number</Label>
                    <Input
                      id="account"
                      value={accountNumber}
                      onChange={(event) => setAccountNumber(event.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
                      placeholder="Enter biller account number"
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reference" className="mb-2 block">Payment Reference</Label>
                    <Input
                      id="reference"
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Invoice, meter, or policy reference"
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate" className="mb-2 block">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="note" className="mb-2 block">Payment Note</Label>
                  <textarea
                    id="note"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional internal note for your records"
                    className={`w-full rounded-xl border px-3 py-3 text-sm outline-none ${darkMode ? 'border-white/10 bg-black/20 text-white' : 'border-slate-200 bg-white/90'}`}
                  />
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold">Quick Amounts</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {QUICK_AMOUNTS.map((quickAmount) => (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() => setAmount(String(quickAmount))}
                        className={`h-11 rounded-2xl border text-sm font-semibold transition-colors ${
                          Number(amount) === quickAmount
                            ? 'border-[#00b388] bg-[#00b388] text-white'
                            : darkMode
                              ? 'border-white/10 bg-black/20 hover:border-[#00b388]'
                              : 'border-slate-200 bg-white/90 hover:border-[#00b388]'
                        }`}
                      >
                        ${quickAmount}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className={`rounded-3xl border p-4 ${innerCardClass}`}>
                    <p className="text-sm font-medium">Posting Speed</p>
                    <p className="mt-2 text-2xl font-semibold">Attempted Instantly</p>
                  </div>
                  <div className={`rounded-3xl border p-4 ${innerCardClass}`}>
                    <p className="text-sm font-medium">Active Category</p>
                    <p className="mt-2 text-2xl font-semibold">{category}</p>
                  </div>
                  <div className={`rounded-3xl border p-4 ${innerCardClass}`}>
                    <p className="text-sm font-medium">Transaction Limit</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(transactionLimit, currency).replace(/^US\$/, '$')}</p>
                  </div>
                </div>

                {submitting ? (
                  <div className={`rounded-2xl border px-4 py-4 flex items-center gap-3 ${darkMode ? 'border-[#1d3b36] bg-[#0d1715]' : 'border-[#bde9da] bg-[#f2fbf8]'}`}>
                    <div className="h-5 w-5 rounded-full border-2 border-[#00b388]/30 border-t-[#00b388] animate-spin" />
                    <div>
                      <p className="text-sm font-semibold">Processing bill payment</p>
                      <p className="text-xs text-muted-foreground">{processingMessage || 'Please wait...'}</p>
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                {success ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                ) : null}

                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#00A36C] via-[#00b388] to-[#008080] text-white shadow-[0_14px_30px_rgba(0,163,108,0.24)] hover:from-[#00b377] hover:via-[#00c396] hover:to-[#009191]"
                >
                  {submitting ? 'Processing Payment...' : 'Pay Bill'}
                </Button>
              </div>
            </Card>

            <Card className={`p-6 ${shellCardClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Recent Bill Payments</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Every completed bill settlement with payee and account details.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <ReceiptText className="h-5 w-5 text-[#7ef5cf]" />
                </div>
              </div>

              <div className="mt-5 space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {payments.length === 0 ? (
                  <div className={`rounded-3xl border p-5 ${innerCardClass}`}>
                    <p className="font-medium">No bill payments yet</p>
                    <p className={`mt-2 text-sm ${mutedTextClass}`}>
                      Completed payments will appear here with payee information and settlement amount.
                    </p>
                  </div>
                ) : (
                  payments.map((payment) => {
                    const PaymentIcon = CATEGORY_ICON_MAP[payment.category] || ReceiptText;

                    return (
                      <div key={payment.id} className={`rounded-3xl border p-4 ${innerCardClass}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                              <PaymentIcon className="h-5 w-5 text-[#7ef5cf]" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold">{payment.payeeName}</p>
                              <p className={`mt-1 text-xs ${mutedTextClass}`}>
                                {payment.category} | {new Date(payment.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-red-400">
                              -{formatCurrency(payment.amount, currency).replace(/^US\$/, '$')}
                            </p>
                            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              payment.status === 'failed'
                                ? 'bg-red-500/15 text-red-200'
                                : 'bg-emerald-500/15 text-emerald-200'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                        </div>
                        <p className={`mt-3 text-xs break-all ${mutedTextClass}`}>Account: {payment.accountNumber}</p>
                        {payment.note ? <p className={`mt-2 text-xs ${mutedTextClass}`}>Note: {payment.note}</p> : null}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </UserFeaturePageShell>
  );
}
