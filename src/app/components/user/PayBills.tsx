import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ReceiptText, CircleCheck, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { formatCurrency } from '../ui/utils';
import UserFeaturePageShell from './UserFeaturePageShell';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import { BillPaymentRecord, calculateCompletedBalance, getPreferenceArray } from './userAccountState';

const BILL_CATEGORIES = ['Electricity', 'Internet', 'Water', 'Cable TV', 'Insurance', 'School Fees'];
const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 1500];

export default function PayBills() {
  const { user } = useAuthContext();
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});
  const [payments, setPayments] = useState<BillPaymentRecord[]>([]);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        supabaseDbService.getTransactions(user.id, 500),
      ]);

      const preferences = profile?.preferences || {};
      setProfilePreferences(preferences);
      setDarkMode(Boolean(preferences.darkMode));
      setPayments(getPreferenceArray<BillPaymentRecord>(preferences, 'billPayments'));
      setBalance(calculateCompletedBalance(transactions));
      setCurrency(profile?.currency || user.currency || 'USD');
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

    setSubmitting(true);
    setError('');
    setSuccess('');

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
        status: 'completed',
      };

      const transaction = await supabaseDbService.createTransaction({
        user_id: user.id,
        account_id: account.id,
        type: 'debit',
        amount: paymentAmount,
        description: `Bill payment to ${paymentRecord.payeeName}`,
        currency: account.currency,
        status: 'completed',
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
        setError('The bill payment could not be completed.');
        return;
      }

      await Promise.all([
        supabaseDbService.createActivity({
          user_id: user.id,
          type: 'pay_bills',
          description: `Bill payment completed for ${paymentRecord.payeeName}`,
          amount: paymentAmount,
        }),
        supabaseDbService.createNotification({
          user_id: user.id,
          title: 'Bill Payment Successful',
          message: `${formatCurrency(paymentAmount, account.currency)} was paid to ${paymentRecord.payeeName}.`,
          type: 'success',
          read: false,
          path: '/activity',
        }),
      ]);

      const nextPayments = [paymentRecord, ...payments].slice(0, 20);
      setPayments(nextPayments);
      setBalance((current) => current - paymentAmount);
      await persistPayments(nextPayments);

      setSuccess(`Paid ${formatCurrency(paymentAmount, account.currency)} to ${paymentRecord.payeeName}.`);
      setPayeeName('');
      setAccountNumber('');
      setReference('');
      setAmount('');
      setDueDate('');
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFeaturePageShell
      title="Pay Bills"
      description="Settle utilities and household bills from your account balance."
      darkMode={darkMode}
      icon={<ReceiptText className="w-5 h-5 text-[#00a37a]" />}
      onBack={() => navigate('/dashboard')}
    >
      {loading ? (
        <Card className={`p-8 text-center ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
          <p className="text-muted-foreground">Loading bill payment workspace...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="space-y-6">
            <Card className={`p-6 space-y-5 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Available to spend</p>
                  <p className="text-3xl font-semibold mt-2">{formatCurrency(balance, currency).replace(/^US\$/, '$')}</p>
                </div>
                <div className="rounded-2xl bg-[#e9f8f3] px-4 py-3 text-sm text-[#006b54]">
                  Same-day posting for most supported billers
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="mb-2 block">Bill Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={`w-full h-12 rounded-xl border px-3 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-border'}`}
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
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="payee" className="mb-2 block">Biller Name</Label>
                  <Input
                    id="payee"
                    value={payeeName}
                    onChange={(event) => setPayeeName(event.target.value)}
                    placeholder="Comcast, Duke Energy, State Farm"
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="account" className="mb-2 block">Customer / Account Number</Label>
                  <Input
                    id="account"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
                    placeholder="Enter biller account number"
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="reference" className="mb-2 block">Payment Reference</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Invoice, meter, or policy reference"
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate" className="mb-2 block">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
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
                  className={`w-full rounded-xl border px-3 py-3 text-sm outline-none ${darkMode ? 'bg-[#0d1117] border-[#21262d] text-white' : 'bg-white border-border'}`}
                />
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Quick Amounts</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {QUICK_AMOUNTS.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => setAmount(String(quickAmount))}
                      className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
                        Number(amount) === quickAmount
                          ? 'bg-[#00b388] text-white border-[#00b388]'
                          : darkMode
                            ? 'border-[#21262d] bg-[#0d1117] hover:border-[#00b388]'
                            : 'border-border bg-white hover:border-[#00b388]'
                      }`}
                    >
                      ${quickAmount}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
                  <CircleCheck className="w-4 h-4 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full h-12 bg-gradient-to-r from-[#00A36C] to-[#008080] hover:from-[#00b377] hover:to-[#009191] text-white"
              >
                {submitting ? 'Processing Payment...' : 'Pay Bill'}
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <h2 className="text-lg font-semibold mb-4">Recent Bill Payments</h2>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Your completed bill payments will appear here.</p>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`rounded-xl border p-4 ${darkMode ? 'border-[#21262d] bg-[#0d1117]' : 'border-border bg-white'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{payment.payeeName}</p>
                          <p className="text-xs text-muted-foreground">{payment.category} · {new Date(payment.createdAt).toLocaleDateString()}</p>
                        </div>
                        <p className="font-semibold text-red-600">-{formatCurrency(payment.amount, currency).replace(/^US\$/, '$')}</p>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground break-all">Account: {payment.accountNumber}</p>
                      {payment.note ? <p className="mt-2 text-xs text-muted-foreground">Note: {payment.note}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </UserFeaturePageShell>
  );
}


