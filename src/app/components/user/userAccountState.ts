import type { Profile, Transaction } from '../../../services/supabaseDbService';

export type AccountFreezeState = {
  isFrozen: boolean;
  reason: 'withdrawal_security_pin';
  securityPin: string;
  pendingWithdrawalId: string;
  createdAt: string;
  amount: number;
  currency?: string;
  method?: 'linked-bank' | 'external-bank';
  selectedLinkedAccountId?: string | null;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  remark?: string;
  estimatedArrival?: string;
};

export interface LoanApplication {
  id: string;
  amount: number;
  termMonths: number;
  purpose: string;
  monthlyIncome: number;
  monthlyDebt: number;
  employerName: string;
  status: 'pending' | 'reviewing' | 'approved' | 'declined';
  apr: number;
  createdAt: string;
}

export interface BillPaymentRecord {
  id: string;
  category: string;
  payeeName: string;
  accountNumber: string;
  amount: number;
  dueDate?: string;
  note?: string;
  createdAt: string;
  status: 'completed';
}

export interface BettingTransferRecord {
  id: string;
  provider: string;
  walletId: string;
  amount: number;
  note?: string;
  createdAt: string;
  status: 'completed';
}

export interface CashbackClaimRecord {
  id: string;
  amount: number;
  createdAt: string;
  sourceTransactionIds: string[];
}

export function calculateCompletedBalance(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.status === 'completed')
    .reduce((total, transaction) => {
      const amount = Number(transaction.amount || 0);
      return transaction.type === 'credit' ? total + amount : total - amount;
    }, 0);
}

export function calculateAccountAgeDays(createdAt?: string | Date) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const diffMs = Date.now() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getPreferenceArray<T>(preferences: Record<string, any> | null | undefined, key: string): T[] {
  const value = preferences?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function getActiveFreezeState(preferences?: Record<string, any> | null): AccountFreezeState | null {
  const raw = preferences?.accountFreeze;
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.isFrozen || typeof raw.securityPin !== 'string' || typeof raw.pendingWithdrawalId !== 'string') {
    return null;
  }

  return {
    isFrozen: true,
    reason: 'withdrawal_security_pin',
    securityPin: raw.securityPin,
    pendingWithdrawalId: raw.pendingWithdrawalId,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    amount: Number(raw.amount || 0),
    currency: raw.currency ? String(raw.currency) : undefined,
    method: raw.method === 'linked-bank' ? 'linked-bank' : 'external-bank',
    selectedLinkedAccountId: raw.selectedLinkedAccountId ? String(raw.selectedLinkedAccountId) : null,
    bankName: raw.bankName ? String(raw.bankName) : undefined,
    accountNumber: raw.accountNumber ? String(raw.accountNumber) : undefined,
    accountName: raw.accountName ? String(raw.accountName) : undefined,
    remark: raw.remark ? String(raw.remark) : undefined,
    estimatedArrival: raw.estimatedArrival ? String(raw.estimatedArrival) : undefined,
  };
}

export function clearFreezeState(preferences?: Record<string, any> | null) {
  const next = { ...(preferences || {}) };
  delete next.accountFreeze;
  return next;
}

export function generateSecurityPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function maskAccountNumber(accountNumber?: string | null) {
  if (!accountNumber) return 'N/A';
  const trimmed = String(accountNumber).trim();
  if (trimmed.length <= 4) return trimmed;
  return `${'*'.repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export function isWithdrawalLikeTransaction(transaction: Transaction) {
  if (transaction.type !== 'debit') return false;
  const description = (transaction.description || '').toLowerCase();
  return description.includes('withdraw') || Boolean(transaction.metadata?.method);
}

export function getClaimedCashbackTransactionIds(preferences?: Record<string, any> | null) {
  const claims = getPreferenceArray<CashbackClaimRecord>(preferences, 'cashbackClaims');
  return new Set(claims.flatMap((claim) => claim.sourceTransactionIds || []));
}

export function getEligibleCashbackTransactions(
  transactions: Transaction[],
  claimedIds: Set<string>,
) {
  return transactions.filter((transaction) => {
    if (transaction.status !== 'completed' || transaction.type !== 'debit') return false;
    if (claimedIds.has(transaction.id)) return false;
    if (isWithdrawalLikeTransaction(transaction)) return false;
    const feature = String(transaction.metadata?.feature || '').toLowerCase();
    if (feature === 'betting' || feature === 'loan') return false;
    return true;
  });
}

export function getProfileCreatedAt(profile: Profile | null, fallback?: Date) {
  if (profile?.created_at) return profile.created_at;
  if (fallback) return fallback.toISOString();
  return undefined;
}
