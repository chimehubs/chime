import { useEffect, useMemo, useState } from 'react';
import { Landmark, CircleCheck, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { formatCurrency } from '../ui/utils';
import UserFeaturePageShell from './UserFeaturePageShell';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService } from '../../../services/supabaseDbService';
import {
  LoanApplication,
  calculateAccountAgeDays,
  getPreferenceArray,
  getProfileCreatedAt,
} from './userAccountState';

const TERM_OPTIONS = [6, 12, 24, 36];
const QUICK_AMOUNTS = [1000, 2500, 5000, 10000];

function calculateApr(termMonths: number) {
  if (termMonths <= 6) return 8.9;
  if (termMonths <= 12) return 10.5;
  if (termMonths <= 24) return 12.9;
  return 14.5;
}

function calculateMonthlyPayment(amount: number, apr: number, termMonths: number) {
  if (!amount || !termMonths) return 0;
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return amount / termMonths;
  return (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

export default function Loan() {
  const { user } = useAuthContext();
  const [darkMode, setDarkMode] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, any>>({});
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [amount, setAmount] = useState('');
  const [termMonths, setTermMonths] = useState(12);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyDebt, setMonthlyDebt] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const profile = await supabaseDbService.getProfile(user.id);
      const preferences = profile?.preferences || {};
      setProfilePreferences(preferences);
      setDarkMode(Boolean(preferences.darkMode));
      setApplications(getPreferenceArray<LoanApplication>(preferences, 'loanApplications'));
      setCurrency(profile?.currency || user.currency || 'USD');
      setAccountAgeDays(calculateAccountAgeDays(getProfileCreatedAt(profile, user.createdAt)));
      setLoading(false);
    };

    loadData();
  }, [user?.id, user?.currency, user?.createdAt]);

  const amountNumber = useMemo(() => Number(amount || 0), [amount]);
  const incomeNumber = useMemo(() => Number(monthlyIncome || 0), [monthlyIncome]);
  const debtNumber = useMemo(() => Number(monthlyDebt || 0), [monthlyDebt]);
  const isActiveAccount = user?.status === 'ACTIVE';
  const eligible = isActiveAccount && accountAgeDays >= 30;
  const apr = useMemo(() => calculateApr(termMonths), [termMonths]);
  const monthlyPayment = useMemo(() => calculateMonthlyPayment(amountNumber, apr, termMonths), [amountNumber, apr, termMonths]);
  const canSubmit = !!user?.id && eligible && amountNumber >= 500 && incomeNumber > 0 && employerName.trim() && purpose.trim();

  const handleApply = async () => {
    if (!user?.id) return;
    if (!isActiveAccount) {
      setError('Create and activate your account before applying for a loan.');
      return;
    }
    if (!eligible) {
      setError('Your profile must be at least 30 days old before loan application can begin.');
      return;
    }
    if (!canSubmit) {
      setError('Complete the loan application details before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const application: LoanApplication = {
        id: `loan_${Date.now()}`,
        amount: Number(amountNumber.toFixed(2)),
        termMonths,
        purpose: purpose.trim(),
        monthlyIncome: Number(incomeNumber.toFixed(2)),
        monthlyDebt: Number(debtNumber.toFixed(2)),
        employerName: employerName.trim(),
        status: 'reviewing',
        apr,
        createdAt: new Date().toISOString(),
      };

      const nextApplications = [application, ...applications].slice(0, 20);
      const nextPreferences = { ...profilePreferences, loanApplications: nextApplications };

      await Promise.all([
        supabaseDbService.updateProfile(user.id, { preferences: nextPreferences }),
        supabaseDbService.createActivity({
          user_id: user.id,
          type: 'loan',
          description: 'Loan application submitted for review',
          amount: application.amount,
        }),
        supabaseDbService.createNotification({
          user_id: user.id,
          title: 'Loan Application Submitted',
          message: `${formatCurrency(application.amount, currency)} loan request is now under review.`,
          type: 'pending',
          read: false,
          path: '/dashboard/loan',
        }),
      ]);

      setProfilePreferences(nextPreferences);
      setApplications(nextApplications);
      setSuccess('Loan application submitted successfully. Our lending team will review it shortly.');
      setAmount('');
      setMonthlyIncome('');
      setMonthlyDebt('');
      setEmployerName('');
      setPurpose('');
      setTermMonths(12);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFeaturePageShell
      title="Loans"
      description="Apply for personal credit with transparent pricing and review status."
      darkMode={darkMode}
      icon={<Landmark className="w-5 h-5 text-[#00a37a]" />}
      onBack={() => navigate('/dashboard')}
    >
      {loading ? (
        <Card className={`p-8 text-center ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
          <p className="text-muted-foreground">Loading loan eligibility...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Eligibility Status</p>
                  <h2 className="mt-2 text-2xl font-semibold">{eligible ? 'Eligible to Apply' : 'Eligibility Pending'}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Account age: {accountAgeDays} day{accountAgeDays === 1 ? '' : 's'}
                  </p>
                </div>
                <div className={`rounded-2xl px-4 py-3 text-sm ${eligible ? 'bg-[#e9f8f3] text-[#006b54]' : 'bg-amber-50 text-amber-700'}`}>
                  {!isActiveAccount
                    ? 'Complete account creation before applying for credit.'
                    : eligible
                      ? 'You meet the 30-day account age requirement.'
                      : `Apply in ${Math.max(0, 30 - accountAgeDays)} more day(s).`}
                </div>
              </div>
            </Card>

            <Card className={`p-6 space-y-5 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="loanAmount" className="mb-2 block">Requested Amount</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="term" className="mb-2 block">Repayment Term</Label>
                  <select
                    id="term"
                    value={termMonths}
                    onChange={(event) => setTermMonths(Number(event.target.value))}
                    className={`w-full h-12 rounded-xl border px-3 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-border'}`}
                  >
                    {TERM_OPTIONS.map((term) => (
                      <option key={term} value={term}>{term} months</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="income" className="mb-2 block">Monthly Income</Label>
                  <Input
                    id="income"
                    type="number"
                    value={monthlyIncome}
                    onChange={(event) => setMonthlyIncome(event.target.value)}
                    placeholder="0.00"
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="debt" className="mb-2 block">Monthly Debt Obligations</Label>
                  <Input
                    id="debt"
                    type="number"
                    value={monthlyDebt}
                    onChange={(event) => setMonthlyDebt(event.target.value)}
                    placeholder="0.00"
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="employer" className="mb-2 block">Employer / Business Name</Label>
                  <Input
                    id="employer"
                    value={employerName}
                    onChange={(event) => setEmployerName(event.target.value)}
                    placeholder="Your employer or business"
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="purpose" className="mb-2 block">Loan Purpose</Label>
                  <Input
                    id="purpose"
                    value={purpose}
                    onChange={(event) => setPurpose(event.target.value)}
                    placeholder="Home repair, vehicle, tuition"
                    className={`h-12 ${darkMode ? 'bg-[#0d1117] border-[#21262d]' : ''}`}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Quick Amounts</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

              <div className={`rounded-2xl border p-5 ${darkMode ? 'border-[#21262d] bg-[#0d1117]' : 'border-border bg-[#f8fbfa]'}`}>
                <h3 className="text-base font-semibold">Estimated Terms</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">APR</p>
                    <p className="mt-1 font-semibold">{apr.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Payment</p>
                    <p className="mt-1 font-semibold">{formatCurrency(monthlyPayment || 0, currency).replace(/^US\$/, '$')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Decision Basis</p>
                    <p className="mt-1 font-semibold">Account age, income, affordability</p>
                  </div>
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
                onClick={handleApply}
                disabled={!canSubmit || submitting}
                className="w-full h-12 bg-gradient-to-r from-[#00A36C] to-[#008080] hover:from-[#00b377] hover:to-[#009191] text-white"
              >
                {submitting ? 'Submitting Application...' : 'Apply for Loan'}
              </Button>
            </Card>
          </div>

          <Card className={`p-6 ${darkMode ? 'bg-[#161b22] border-[#21262d]' : ''}`}>
            <h2 className="text-lg font-semibold mb-4">Application History</h2>
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No loan applications submitted yet.</p>
              ) : (
                applications.map((application) => (
                  <div key={application.id} className={`rounded-xl border p-4 ${darkMode ? 'border-[#21262d] bg-[#0d1117]' : 'border-border bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{formatCurrency(application.amount, currency).replace(/^US\$/, '$')}</p>
                        <p className="text-xs text-muted-foreground">{application.termMonths} months · {application.apr.toFixed(1)}% APR</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${application.status === 'reviewing' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {application.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm">{application.purpose}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Submitted {new Date(application.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </UserFeaturePageShell>
  );
}

