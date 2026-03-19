import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  BadgeDollarSign,
  BriefcaseBusiness,
  CircleCheck,
  Clock3,
  FileSearch,
  Landmark,
  ShieldCheck,
  Sparkles,
  WalletCards,
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
  const navigate = useNavigate();
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
  const monthlyPayment = useMemo(
    () => calculateMonthlyPayment(amountNumber, apr, termMonths),
    [amountNumber, apr, termMonths],
  );
  const canSubmit =
    !!user?.id &&
    eligible &&
    amountNumber >= 500 &&
    incomeNumber > 0 &&
    employerName.trim().length > 0 &&
    purpose.trim().length > 0;

  const shellCardClass = darkMode
    ? 'border-white/10 bg-white/5 text-white backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.28)]'
    : 'border-slate-200/80 bg-white/80 text-slate-950 backdrop-blur-xl shadow-[0_24px_60px_rgba(15,23,42,0.12)]';
  const innerCardClass = darkMode
    ? 'border-white/10 bg-black/20'
    : 'border-slate-200/80 bg-white/90';
  const mutedTextClass = darkMode ? 'text-slate-300' : 'text-slate-600';

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

  const summaryCards = [
    {
      label: 'Eligibility',
      value: eligible ? 'Ready Now' : 'Pending',
      detail: eligible ? '30-day requirement met' : `${Math.max(0, 30 - accountAgeDays)} day(s) remaining`,
      icon: ShieldCheck,
      accent: 'from-emerald-500/30 via-teal-500/20 to-cyan-500/20',
      iconClass: 'text-emerald-100',
    },
    {
      label: 'Estimated APR',
      value: `${apr.toFixed(1)}%`,
      detail: `${termMonths}-month term`,
      icon: BadgeDollarSign,
      accent: 'from-cyan-500/35 via-sky-500/20 to-emerald-400/20',
      iconClass: 'text-cyan-100',
    },
    {
      label: 'Monthly Payment',
      value: formatCurrency(monthlyPayment || 0, currency).replace(/^US\$/, '$'),
      detail: 'Projected installment',
      icon: WalletCards,
      accent: 'from-violet-500/30 via-fuchsia-500/15 to-cyan-400/15',
      iconClass: 'text-fuchsia-100',
    },
    {
      label: 'Profile Age',
      value: `${accountAgeDays} days`,
      detail: 'Account seasoning',
      icon: Clock3,
      accent: 'from-amber-400/30 via-orange-400/20 to-yellow-300/20',
      iconClass: 'text-amber-100',
    },
  ];

  return (
    <UserFeaturePageShell
      title="Loans"
      description="Apply for personal credit with transparent pricing, fixed review steps, and tracked application status."
      darkMode={darkMode}
      icon={<Landmark className="h-5 w-5 text-[#00a37a]" />}
      onBack={() => navigate('/dashboard')}
    >
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.22)] sm:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,46,38,0.96),rgba(12,74,110,0.9)_58%,rgba(8,145,178,0.84))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
        <motion.div
          className="absolute right-6 top-6 rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl"
          animate={{ y: [0, -10, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Landmark className="h-10 w-10 text-white/90" />
        </motion.div>
        <motion.div
          className="absolute bottom-6 right-24 rounded-[24px] border border-white/10 bg-white/10 p-3 backdrop-blur-xl"
          animate={{ y: [0, 8, 0], x: [0, 4, 0] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FileSearch className="h-6 w-6 text-[#b8fff2]" />
        </motion.div>

        <div className="relative max-w-3xl text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-[#7ef5cf]" />
            Lending Desk
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Apply with a clear repayment view before you submit.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/78 sm:text-base">
            Chimehubs reviews loan requests based on account age, affordability, income strength, and profile stability.
            Every application is logged so you can track its review status from one place.
          </p>
        </div>
      </section>

      {loading ? (
        <Card className={`p-8 text-center ${shellCardClass}`}>
          <p className={mutedTextClass}>Loading loan eligibility...</p>
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
                      Eligibility Review
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {!isActiveAccount
                        ? 'Activate your banking profile before requesting credit.'
                        : eligible
                          ? 'Your profile is ready for a loan application.'
                          : 'Your loan profile is still seasoning.'}
                    </h2>
                    <p className={`max-w-2xl text-sm ${mutedTextClass}`}>
                      {!isActiveAccount
                        ? 'Finish account creation first. Loan applications are available only to active accounts.'
                        : eligible
                          ? 'You meet the account-age rule and can submit a full application now.'
                          : `Loan access opens once your account reaches 30 days. You have ${Math.max(0, 30 - accountAgeDays)} day(s) remaining.`}
                    </p>
                  </div>
                  <div className={`rounded-3xl border px-4 py-3 text-sm ${innerCardClass}`}>
                    <p className="font-semibold">Affordability Preview</p>
                    <p className={`mt-1 text-xs ${mutedTextClass}`}>
                      Estimated monthly payment: {formatCurrency(monthlyPayment || 0, currency).replace(/^US\$/, '$')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="loanAmount" className="mb-2 block">Requested Amount</Label>
                    <Input
                      id="loanAmount"
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="term" className="mb-2 block">Repayment Term</Label>
                    <select
                      id="term"
                      value={termMonths}
                      onChange={(event) => setTermMonths(Number(event.target.value))}
                      className={`h-12 w-full rounded-xl border px-3 ${darkMode ? 'border-white/10 bg-black/20 text-white' : 'border-slate-200 bg-white/90'}`}
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
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
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
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="employer" className="mb-2 block">Employer / Business Name</Label>
                    <div className="relative">
                      <BriefcaseBusiness className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                      <Input
                        id="employer"
                        value={employerName}
                        onChange={(event) => setEmployerName(event.target.value)}
                        placeholder="Your employer or business"
                        className={`h-12 pl-10 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="purpose" className="mb-2 block">Loan Purpose</Label>
                    <Input
                      id="purpose"
                      value={purpose}
                      onChange={(event) => setPurpose(event.target.value)}
                      placeholder="Home repair, medical, education"
                      className={`h-12 ${darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/90'}`}
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold">Quick Amounts</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    <p className="text-sm font-medium">APR</p>
                    <p className="mt-2 text-2xl font-semibold">{apr.toFixed(1)}%</p>
                  </div>
                  <div className={`rounded-3xl border p-4 ${innerCardClass}`}>
                    <p className="text-sm font-medium">Monthly Payment</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCurrency(monthlyPayment || 0, currency).replace(/^US\$/, '$')}
                    </p>
                  </div>
                  <div className={`rounded-3xl border p-4 ${innerCardClass}`}>
                    <p className="text-sm font-medium">Decision Basis</p>
                    <p className={`mt-2 text-sm ${mutedTextClass}`}>Income, debt load, account history, and term selection.</p>
                  </div>
                </div>

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
                  onClick={handleApply}
                  disabled={!canSubmit || submitting}
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#00A36C] via-[#00b388] to-[#008080] text-white shadow-[0_14px_30px_rgba(0,163,108,0.24)] hover:from-[#00b377] hover:via-[#00c396] hover:to-[#009191]"
                >
                  {submitting ? 'Submitting Application...' : 'Apply for Loan'}
                </Button>
              </div>
            </Card>

            <Card className={`p-6 ${shellCardClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Application History</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>Track every loan request and its current review stage.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <FileSearch className="h-5 w-5 text-[#7ef5cf]" />
                </div>
              </div>

              <div className="mt-5 space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {applications.length === 0 ? (
                  <div className={`rounded-3xl border p-5 ${innerCardClass}`}>
                    <p className="font-medium">No loan applications yet</p>
                    <p className={`mt-2 text-sm ${mutedTextClass}`}>
                      Submitted applications will appear here with term, rate, and review status.
                    </p>
                  </div>
                ) : (
                  applications.map((application) => (
                    <div key={application.id} className={`rounded-3xl border p-4 ${innerCardClass}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">
                            {formatCurrency(application.amount, currency).replace(/^US\$/, '$')}
                          </p>
                          <p className={`mt-1 text-xs ${mutedTextClass}`}>
                            {application.termMonths} months | {application.apr.toFixed(1)}% APR
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold capitalize text-amber-200">
                          {application.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm">{application.purpose}</p>
                      <p className={`mt-2 text-xs ${mutedTextClass}`}>
                        Submitted {new Date(application.createdAt).toLocaleString()}
                      </p>
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
