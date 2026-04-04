import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  FileText,
  LogIn,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import AdminLayout from './AdminLayout';
import {
  supabaseDbService,
  type Account,
  type Activity,
  type Profile,
  type Transaction,
} from '../../../services/supabaseDbService';

type FilterType = 'all' | 'auth' | 'deposit' | 'withdrawal' | 'transfer' | 'funding' | 'support' | 'profile';
type FilterStatus = 'all' | 'success' | 'pending' | 'failed';
type SortBy = 'recent' | 'oldest' | 'amount_high' | 'amount_low';
type RecordCategory = Exclude<FilterType, 'all'>;
type RecordStatus = Exclude<FilterStatus, 'all'>;

interface AdminRecord {
  id: string;
  sourceId: string;
  kind: 'transaction' | 'activity';
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorPhone: string;
  actorType: 'admin' | 'user';
  title: string;
  description: string;
  category: RecordCategory;
  status: RecordStatus;
  createdAt?: string;
  timestampValue: number;
  currency: string;
  amountValue: number | null;
  amountLabel: string;
  sourceAccountId?: string;
  sourceAccountNumber?: string;
  sourceRoutingNumber?: string;
  destinationTitle: string;
  destinationSubtitle: string;
  destinationBankName?: string;
  destinationAccountName?: string;
  destinationAccountNumber?: string;
  destinationRemark?: string;
  details: Record<string, unknown>;
  rawPayload: string;
}

const FILTER_OPTIONS: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'All records' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'auth', label: 'Auth' },
  { value: 'support', label: 'Support' },
  { value: 'profile', label: 'Profile' },
  { value: 'funding', label: 'Funding' },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function formatCurrency(value: number | null | undefined, currency = 'USD') {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatTimestamp(value?: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function formatShortTimestamp(value?: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function maskAccountNumber(value?: string) {
  if (!value) return 'N/A';
  const trimmed = value.replace(/\s+/g, '');
  if (trimmed.length <= 4) return trimmed;
  return `****${trimmed.slice(-4)}`;
}

function toSentence(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveTransactionCategory(transaction: Transaction, metadata: Record<string, unknown>): RecordCategory {
  const description = String(transaction.description || '').toLowerCase();
  const hasBankDetails = Object.keys(asRecord(metadata.bank_details ?? metadata.bankDetails)).length > 0;

  if (transaction.type === 'credit') {
    if (description.includes('fund') || description.includes('bank transfer')) return 'funding';
    return 'deposit';
  }

  if (description.includes('transfer')) return 'transfer';
  if (description.includes('withdraw') || hasBankDetails || metadata.requires_security_pin) return 'withdrawal';
  return 'withdrawal';
}

function resolveActivityCategory(activity: Activity): RecordCategory {
  const rawType = String(activity.type || 'profile').toLowerCase();
  const description = String(activity.description || '').toLowerCase();

  if (rawType === 'debit') return description.includes('transfer') ? 'transfer' : 'withdrawal';
  if (rawType === 'credit') return description.includes('fund') ? 'funding' : 'deposit';
  if (rawType === 'auth' || rawType === 'funding' || rawType === 'support' || rawType === 'profile') return rawType;
  return 'profile';
}

function getRecordStatus(status: string): RecordStatus {
  if (status === 'pending') return 'pending';
  if (status === 'failed') return 'failed';
  return 'success';
}

function extractWithdrawalDestination(transaction: Transaction) {
  const metadata = asRecord(transaction.metadata);
  const bankDetails = asRecord(metadata.bank_details ?? metadata.bankDetails);
  const bankName =
    getString(bankDetails.bank_name) ||
    getString(bankDetails.bankName) ||
    String(transaction.description || '').replace(/^Withdrawal to\s*/i, '').trim() ||
    undefined;
  const accountName = getString(bankDetails.account_name) || getString(bankDetails.accountName);
  const accountNumber = getString(bankDetails.account_number) || getString(bankDetails.accountNumber);
  const remark = getString(bankDetails.remark);

  if (bankName || accountName || accountNumber) {
    return {
      destinationTitle: bankName || 'External bank',
      destinationSubtitle:
        accountNumber || accountName
          ? `${accountName || 'Destination account'} / ${maskAccountNumber(accountNumber)}`
          : 'Destination captured in withdrawal payload',
      destinationBankName: bankName,
      destinationAccountName: accountName,
      destinationAccountNumber: accountNumber,
      destinationRemark: remark,
    };
  }

  return {
    destinationTitle: 'No destination account',
    destinationSubtitle: 'This withdrawal predates destination tracking or has no bank payload.',
  };
}

function getCategoryIcon(category: RecordCategory) {
  switch (category) {
    case 'auth':
      return <LogIn className="h-4 w-4" />;
    case 'deposit':
      return <ArrowDownLeft className="h-4 w-4" />;
    case 'withdrawal':
      return <ArrowUpRight className="h-4 w-4" />;
    case 'transfer':
      return <Wallet className="h-4 w-4" />;
    case 'funding':
      return <CreditCard className="h-4 w-4" />;
    case 'support':
      return <MessageSquare className="h-4 w-4" />;
    case 'profile':
      return <User className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getCategoryTone(category: RecordCategory) {
  switch (category) {
    case 'withdrawal':
      return 'bg-rose-50 text-rose-700 border-rose-100';
    case 'deposit':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'transfer':
      return 'bg-sky-50 text-sky-700 border-sky-100';
    case 'funding':
      return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    case 'support':
      return 'bg-violet-50 text-violet-700 border-violet-100';
    case 'auth':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-100';
  }
}

function getStatusTone(status: RecordStatus) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'failed':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-emerald-100 text-emerald-800';
  }
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#e8efec] bg-[#fbfdfc] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 text-sm text-slate-900 ${mono ? 'font-mono break-all' : 'break-words'}`}>{value || 'N/A'}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden border-[#d9e8e2] bg-white/95 shadow-sm">
      <div className={`h-1 w-full ${tone}`} />
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{hint}</p>
      </div>
    </Card>
  );
}

export default function AdminTransactions() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRecords = async () => {
      setLoading(true);

      const [profiles, accounts, transactions, activities] = await Promise.all([
        supabaseDbService.getAllProfiles(),
        supabaseDbService.getAllAccounts(),
        supabaseDbService.getAllTransactions(),
        supabaseDbService.getAllActivities(),
      ]);

      if (!isMounted) return;

      const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
      const accountById = new Map(accounts.map((account) => [account.id, account]));

      const transactionRecords = transactions.map((transaction) =>
        buildTransactionRecord(transaction, profileById, accountById)
      );
      const activityRecords = activities.map((activity) => buildActivityRecord(activity, profileById, accountById));

      setRecords(
        [...transactionRecords, ...activityRecords].sort((a, b) => b.timestampValue - a.timestampValue)
      );
      setLoading(false);
    };

    void loadRecords();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let next = [...records];

    if (filterType !== 'all') {
      next = next.filter((record) => record.category === filterType);
    }

    if (filterStatus !== 'all') {
      next = next.filter((record) => record.status === filterStatus);
    }

    if (query) {
      next = next.filter((record) => {
        const haystack = [
          record.actorName,
          record.actorEmail,
          record.title,
          record.description,
          record.destinationTitle,
          record.destinationSubtitle,
          record.destinationAccountNumber,
          record.destinationAccountName,
          record.destinationBankName,
          record.sourceAccountNumber,
          record.rawPayload,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    next.sort((a, b) => {
      if (sortBy === 'oldest') return a.timestampValue - b.timestampValue;
      if (sortBy === 'amount_high') return (b.amountValue || 0) - (a.amountValue || 0);
      if (sortBy === 'amount_low') return (a.amountValue || 0) - (b.amountValue || 0);
      return b.timestampValue - a.timestampValue;
    });

    return next;
  }, [filterStatus, filterType, records, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const movementValue = filteredRecords.reduce((total, record) => total + Math.abs(record.amountValue || 0), 0);
    const pendingCount = filteredRecords.filter((record) => record.status === 'pending').length;
    const trackedDestinations = filteredRecords.filter(
      (record) => record.category === 'withdrawal' && record.destinationAccountNumber
    ).length;
    const failedCount = filteredRecords.filter((record) => record.status === 'failed').length;

    return {
      totalRecords: filteredRecords.length,
      movementValue,
      pendingCount,
      trackedDestinations,
      failedCount,
    };
  }, [filteredRecords]);

  return (
    <AdminLayout title="Transactions">
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-[#dbe7e2] bg-[radial-gradient(circle_at_top_left,#effbf6_0%,#ffffff_45%,#f6fafc_100%)] shadow-sm">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-[#00b388]/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
          </div>
          <div className="relative grid gap-6 px-6 py-7 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#008a6a]">Admin transaction center</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900">
                Audit money movement, inspect withdrawal destinations, and open any record in one click.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Every row below is clickable. Withdrawal records now surface the destination bank and account preview directly in the list, with full details inside the popup review card.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Visible records</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.totalRecords}</p>
                <p className="mt-2 text-sm text-slate-500">Search, filter, and sort apply instantly.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tracked destinations</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.trackedDestinations}</p>
                <p className="mt-2 text-sm text-slate-500">Withdrawal records with destination account data.</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Records"
            value={String(stats.totalRecords)}
            hint="Transactions and related account activity in the current view."
            tone="bg-gradient-to-r from-slate-600 to-slate-900"
          />
          <StatCard
            label="Money Movement"
            value={formatCurrency(stats.movementValue, 'USD')}
            hint="Absolute volume across the filtered records."
            tone="bg-gradient-to-r from-[#00b388] to-[#008f74]"
          />
          <StatCard
            label="Pending Queue"
            value={String(stats.pendingCount)}
            hint="Records still waiting on review or completion."
            tone="bg-gradient-to-r from-amber-400 to-orange-500"
          />
          <StatCard
            label="Failed Items"
            value={String(stats.failedCount)}
            hint="Items that need follow-up or explanation."
            tone="bg-gradient-to-r from-rose-400 to-rose-600"
          />
        </div>

        <Card className="border-[#dbe7e2] bg-white/95 p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by user, destination bank, account number, or payload..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 border-[#dbe7e2] bg-[#fbfdfc] pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilterType(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      filterType === option.value
                        ? 'border-[#00b388] bg-[#e9fbf5] text-[#00785d]'
                        : 'border-[#dbe7e2] bg-white text-slate-600 hover:border-[#b8dacf] hover:text-slate-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
                <select
                  title="Filter by status"
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
                  className="h-12 w-full rounded-xl border border-[#dbe7e2] bg-[#fbfdfc] px-3 text-sm text-slate-700 outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="success">Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sort</span>
                <select
                  title="Sort transactions"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortBy)}
                  className="h-12 w-full rounded-xl border border-[#dbe7e2] bg-[#fbfdfc] px-3 text-sm text-slate-700 outline-none"
                >
                  <option value="recent">Most recent</option>
                  <option value="oldest">Oldest first</option>
                  <option value="amount_high">Amount high to low</option>
                  <option value="amount_low">Amount low to high</option>
                </select>
              </label>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-[#dbe7e2] bg-white shadow-sm">
          <div className="border-b border-[#e6efeb] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Transaction stream</h3>
                <p className="text-sm text-slate-500">Tap any row to open the full, scrollable detail card.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-[#dbe7e2] bg-[#fbfdfc] px-3 py-1.5 text-xs text-slate-500 sm:flex">
                <ShieldCheck className="h-4 w-4 text-[#00b388]" />
                Admin visibility enabled for withdrawal destinations
              </div>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <CircleAlert className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">No records match the current filters</h4>
              <p className="mt-2 text-sm text-slate-500">Adjust the search or filter set to reveal more activity.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#edf3f0]">
              {filteredRecords.map((record, index) => (
                <motion.button
                  key={record.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedRecord(record)}
                  className="group block w-full px-5 py-4 text-left transition-colors hover:bg-[#f8fcfa]"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.95fr)_180px_110px] xl:items-center">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getCategoryTone(record.category)}`}>
                        {getCategoryIcon(record.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-slate-900">{record.title}</p>
                          <Badge className={`border ${getCategoryTone(record.category)}`}>{toSentence(record.category)}</Badge>
                          <Badge className={getStatusTone(record.status)}>{toSentence(record.status)}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{record.description}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {record.actorName}
                          </span>
                          {record.actorEmail && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {record.actorEmail}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatShortTimestamp(record.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#e6efeb] bg-[#fbfdfc] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Destination</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{record.destinationTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.destinationSubtitle}</p>
                    </div>

                    <div className="xl:text-right">
                      <p
                        className={`text-lg font-semibold ${
                          record.category === 'withdrawal' || record.category === 'transfer'
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {record.amountLabel}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {record.sourceAccountNumber ? `Source ${maskAccountNumber(record.sourceAccountNumber)}` : 'No source account'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between xl:justify-end">
                      <span className="text-sm font-medium text-[#008a6a]">View details</span>
                      <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6"
            onClick={() => setSelectedRecord(null)}
          >
            <div className="flex h-full items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                onClick={(event) => event.stopPropagation()}
                className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[#dbe7e2] bg-white shadow-[0_40px_140px_rgba(15,23,42,0.32)]"
              >
                <div className="relative overflow-hidden border-b border-[#dbe7e2] bg-[linear-gradient(135deg,#0f766e_0%,#00b388_48%,#d9fff0_100%)] px-6 py-6 text-white">
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-white/12 blur-2xl" />
                    <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-slate-900/15 blur-2xl" />
                  </div>
                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border border-white/20 bg-white/15 text-white">{toSentence(selectedRecord.kind)}</Badge>
                        <Badge className="border border-white/20 bg-white/15 text-white">{toSentence(selectedRecord.category)}</Badge>
                        <Badge className="border border-white/20 bg-white/15 text-white">{toSentence(selectedRecord.status)}</Badge>
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold">{selectedRecord.title}</h3>
                      <p className="mt-2 max-w-3xl text-sm text-white/85">{selectedRecord.description}</p>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/80">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {selectedRecord.actorName}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatTimestamp(selectedRecord.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(null)}
                      className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-6 p-6">
                    <div className="grid gap-4 lg:grid-cols-4">
                      <DetailRow label="Record ID" value={selectedRecord.id} mono />
                      <DetailRow label="Source ID" value={selectedRecord.sourceId} mono />
                      <DetailRow label="Amount" value={selectedRecord.amountLabel} />
                      <DetailRow label="Currency" value={selectedRecord.currency || 'N/A'} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <Card className="border-[#e6efeb] bg-[#fbfdfc] p-5 shadow-none">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-[#008a6a]" />
                          <h4 className="text-lg font-semibold text-slate-900">Destination account</h4>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DetailRow label="Bank name" value={selectedRecord.destinationBankName || selectedRecord.destinationTitle} />
                          <DetailRow label="Account name" value={selectedRecord.destinationAccountName || 'N/A'} />
                          <DetailRow label="Account number" value={selectedRecord.destinationAccountNumber || 'N/A'} mono />
                          <DetailRow label="Remark" value={selectedRecord.destinationRemark || 'N/A'} />
                        </div>
                        {!selectedRecord.destinationAccountNumber && (
                          <div className="mt-4 rounded-2xl border border-dashed border-[#d6e5df] bg-white px-4 py-3 text-sm text-slate-500">
                            No full destination account was stored for this record. Older or non-withdrawal items may only carry a description summary.
                          </div>
                        )}
                      </Card>

                      <Card className="border-[#e6efeb] bg-[#fbfdfc] p-5 shadow-none">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-[#008a6a]" />
                          <h4 className="text-lg font-semibold text-slate-900">Source account and actor</h4>
                        </div>
                        <div className="mt-4 grid gap-3">
                          <DetailRow label="User" value={selectedRecord.actorName} />
                          <DetailRow label="Email" value={selectedRecord.actorEmail || 'N/A'} />
                          <DetailRow label="Phone" value={selectedRecord.actorPhone || 'N/A'} />
                          <DetailRow label="Source account" value={selectedRecord.sourceAccountNumber || 'N/A'} mono />
                          <DetailRow label="Routing number" value={selectedRecord.sourceRoutingNumber || 'N/A'} mono />
                        </div>
                      </Card>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                      <Card className="border-[#e6efeb] bg-[#fbfdfc] p-5 shadow-none">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-5 w-5 text-[#008a6a]" />
                          <h4 className="text-lg font-semibold text-slate-900">Timeline summary</h4>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DetailRow label="Created" value={formatTimestamp(selectedRecord.createdAt)} />
                          <DetailRow label="Status" value={toSentence(selectedRecord.status)} />
                          <DetailRow label="Category" value={toSentence(selectedRecord.category)} />
                          <DetailRow label="Record type" value={toSentence(selectedRecord.kind)} />
                        </div>
                      </Card>

                      <Card className="border-[#e6efeb] bg-[#fbfdfc] p-5 shadow-none">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-[#008a6a]" />
                          <h4 className="text-lg font-semibold text-slate-900">Parsed details</h4>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {Object.entries(selectedRecord.details).map(([key, value]) => (
                            <DetailRow
                              key={key}
                              label={key.replace(/_/g, ' ')}
                              value={
                                value === null || value === undefined
                                  ? 'N/A'
                                  : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)
                              }
                              mono={typeof value !== 'string'}
                            />
                          ))}
                        </div>
                      </Card>
                    </div>

                    <Card className="border-[#e6efeb] bg-[#0f172a] p-5 text-white shadow-none">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#7ee3c8]" />
                        <h4 className="text-lg font-semibold">Raw payload</h4>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">Full record payload for audit and support follow-up.</p>
                      <pre className="mt-4 overflow-x-auto rounded-2xl bg-white/5 p-4 text-xs text-slate-200">
                        {selectedRecord.rawPayload}
                      </pre>
                    </Card>
                  </div>
                </ScrollArea>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

function buildTransactionRecord(
  transaction: Transaction,
  profileById: Map<string, Profile>,
  accountById: Map<string, Account>
): AdminRecord {
  const profile = profileById.get(transaction.user_id);
  const account = accountById.get(transaction.account_id);
  const metadata = asRecord(transaction.metadata);
  const category = resolveTransactionCategory(transaction, metadata);
  const status = getRecordStatus(transaction.status || 'completed');
  const actorName =
    profile?.name ||
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
    profile?.email ||
    'User';
  const currency = transaction.currency || account?.currency || profile?.currency || 'USD';
  const amountValue = Number(transaction.amount || 0);

  const destination =
    category === 'withdrawal'
      ? extractWithdrawalDestination(transaction)
      : category === 'transfer'
        ? {
            destinationTitle:
              String(transaction.description || 'Recipient transfer').replace(/^Transfer to\s*/i, '') || 'Recipient transfer',
            destinationSubtitle: 'Transfer recipient',
          }
        : category === 'deposit' || category === 'funding'
          ? {
              destinationTitle: getString(metadata.sender_bank) || 'Internal funding source',
              destinationSubtitle: getString(metadata.sender_name) || 'Deposit source',
            }
          : {
              destinationTitle: 'Internal ledger',
              destinationSubtitle: 'No external destination for this record',
            };

  const details = {
    transaction_id: transaction.id,
    account_id: transaction.account_id,
    source_account_number: account?.account_number || null,
    routing_number: account?.routing_number || null,
    description: transaction.description || '',
    status: transaction.status,
    amount: amountValue,
    currency,
    metadata,
  };

  return {
    id: `tx-${transaction.id}`,
    sourceId: transaction.id,
    kind: 'transaction',
    actorId: transaction.user_id,
    actorName,
    actorEmail: profile?.email || '',
    actorPhone: profile?.phone || '',
    actorType: 'user',
    title:
      category === 'withdrawal'
        ? 'Withdrawal request'
        : category === 'transfer'
          ? 'Transfer request'
          : category === 'funding'
            ? 'Funding entry'
            : 'Deposit entry',
    description: transaction.description || `${toSentence(category)} transaction`,
    category,
    status,
    createdAt: transaction.created_at,
    timestampValue: transaction.created_at ? new Date(transaction.created_at).getTime() : 0,
    currency,
    amountValue,
    amountLabel: formatCurrency(amountValue, currency),
    sourceAccountId: transaction.account_id,
    sourceAccountNumber: account?.account_number,
    sourceRoutingNumber: account?.routing_number,
    destinationTitle: destination.destinationTitle,
    destinationSubtitle: destination.destinationSubtitle,
    destinationBankName: destination.destinationBankName,
    destinationAccountName: destination.destinationAccountName,
    destinationAccountNumber: destination.destinationAccountNumber,
    destinationRemark: destination.destinationRemark,
    details,
    rawPayload: JSON.stringify(
      {
        transaction,
        source_account: account || null,
        profile: profile || null,
      },
      null,
      2
    ),
  };
}

function buildActivityRecord(
  activity: Activity,
  profileById: Map<string, Profile>,
  accountById: Map<string, Account>
): AdminRecord {
  const profile = profileById.get(activity.user_id);
  const actorName =
    profile?.name ||
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
    profile?.email ||
    'User';
  const category = resolveActivityCategory(activity);
  const sourceAccount = Array.from(accountById.values()).find((account) => account.user_id === activity.user_id);
  const currency = profile?.currency || sourceAccount?.currency || 'USD';
  const amountValue = activity.amount !== undefined && activity.amount !== null ? Number(activity.amount) : null;

  const details = {
    activity_id: activity.id,
    activity_type: activity.type || 'profile',
    description: activity.description || '',
    amount: amountValue,
    currency,
  };

  return {
    id: `act-${activity.id}`,
    sourceId: activity.id,
    kind: 'activity',
    actorId: activity.user_id,
    actorName,
    actorEmail: profile?.email || '',
    actorPhone: profile?.phone || '',
    actorType: 'user',
    title: `${toSentence(category)} activity`,
    description: activity.description || 'Account activity logged.',
    category,
    status: 'success',
    createdAt: activity.created_at,
    timestampValue: activity.created_at ? new Date(activity.created_at).getTime() : 0,
    currency,
    amountValue,
    amountLabel: amountValue !== null ? formatCurrency(amountValue, currency) : 'N/A',
    sourceAccountId: sourceAccount?.id,
    sourceAccountNumber: sourceAccount?.account_number,
    sourceRoutingNumber: sourceAccount?.routing_number,
    destinationTitle: category === 'support' ? 'Support timeline' : 'Internal activity',
    destinationSubtitle:
      category === 'withdrawal'
        ? 'Activity record for a withdrawal-related action'
        : category === 'transfer'
          ? 'Activity record for a transfer event'
          : 'No external destination for this activity record',
    details,
    rawPayload: JSON.stringify(
      {
        activity,
        profile: profile || null,
        source_account: sourceAccount || null,
      },
      null,
      2
    ),
  };
}
