import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity as ActivityIcon, ArrowDownLeft, ArrowUpRight, Banknote, ReceiptText, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card } from '../ui/card';
import { formatCurrency } from '../ui/utils';
import { useAuthContext } from '../../../context/AuthProvider';
import { supabaseDbService, type Transaction } from '../../../services/supabaseDbService';
import TransactionDetailsModal from './TransactionDetailsModal';
import UserFeaturePageShell from './UserFeaturePageShell';
import ImageAnnouncementBar from './ImageAnnouncementBar';
import { PROMOTION_SLIDES } from './announcementSlides';

export default function Activity() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [darkMode, setDarkMode] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [profile, items] = await Promise.all([
        supabaseDbService.getProfile(user.id),
        user.status === 'ACTIVE' ? supabaseDbService.getTransactions(user.id, 300) : Promise.resolve([]),
      ]);

      setDarkMode(Boolean(profile?.preferences?.darkMode));
      setTransactions(
        [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
      );
      setLoading(false);
    };

    loadData();
  }, [user?.id, user?.status]);

  const currency = user?.currency || 'USD';
  const completedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.status === 'completed'),
    [transactions],
  );
  const totalCredits = useMemo(
    () => completedTransactions.filter((transaction) => transaction.type === 'credit').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [completedTransactions],
  );
  const totalDebits = useMemo(
    () => completedTransactions.filter((transaction) => transaction.type === 'debit').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [completedTransactions],
  );
  const failedCount = useMemo(
    () => transactions.filter((transaction) => transaction.status === 'failed').length,
    [transactions],
  );

  const shellCardClass = darkMode
    ? 'border-white/10 bg-white/5 text-white backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.28)]'
    : 'border-slate-200/80 bg-white/80 text-slate-950 backdrop-blur-xl shadow-[0_24px_60px_rgba(15,23,42,0.12)]';
  const innerCardClass = darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200/80 bg-white/90';
  const mutedTextClass = darkMode ? 'text-slate-300' : 'text-slate-600';

  const summaryCards = [
    {
      label: 'Completed Credits',
      value: formatCurrency(totalCredits, currency).replace(/^US\$/, '$'),
      detail: 'Settled incoming transactions',
      icon: ArrowDownLeft,
      accent: 'from-emerald-500/30 via-teal-500/20 to-cyan-500/20',
      iconClass: 'text-emerald-100',
    },
    {
      label: 'Completed Debits',
      value: formatCurrency(totalDebits, currency).replace(/^US\$/, '$'),
      detail: 'Settled outgoing transactions',
      icon: ArrowUpRight,
      accent: 'from-cyan-500/35 via-sky-500/20 to-emerald-400/20',
      iconClass: 'text-cyan-100',
    },
    {
      label: 'Total Entries',
      value: String(transactions.length),
      detail: 'All logged transaction records',
      icon: ReceiptText,
      accent: 'from-violet-500/30 via-fuchsia-500/15 to-cyan-400/15',
      iconClass: 'text-fuchsia-100',
    },
    {
      label: 'Failed Activity',
      value: String(failedCount),
      detail: 'Transactions that need attention',
      icon: TrendingUp,
      accent: 'from-amber-400/30 via-orange-400/20 to-yellow-300/20',
      iconClass: 'text-amber-100',
    },
  ];

  return (
    <UserFeaturePageShell
      title="Activity"
      description="Review completed credits, debits, and flagged transaction attempts from one clean timeline."
      darkMode={darkMode}
      icon={<ActivityIcon className="h-5 w-5 text-[#00a37a]" />}
      onBack={() => navigate('/dashboard')}
    >
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.22)] sm:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(4,28,45,0.96),rgba(7,66,58,0.9)_52%,rgba(14,165,233,0.78))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_26%)]" />
        <motion.div
          className="absolute right-6 top-6 rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl"
          animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Banknote className="h-10 w-10 text-white/90" />
        </motion.div>

        <div className="relative max-w-3xl text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80">
            <ActivityIcon className="h-3.5 w-3.5 text-[#7ef5cf]" />
            Account Timeline
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Every movement on your account, organized in one place.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/78 sm:text-base">
            Track incoming funds, outgoing payments, and failed attempts with a clearer transaction timeline and detailed drill-down view.
          </p>
        </div>
      </section>

      <ImageAnnouncementBar items={PROMOTION_SLIDES} className="h-[108px]" />

      {loading ? (
        <Card className={`p-8 text-center ${shellCardClass}`}>
          <p className={mutedTextClass}>Loading transaction activity...</p>
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

          <Card className={`p-6 ${shellCardClass}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Transaction Timeline</h2>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                  Tap any row to see the full transaction details.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/75">
                {transactions.length} entries
              </div>
            </div>

            <div className="mt-5 space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <div className={`rounded-3xl border p-6 text-center ${innerCardClass}`}>
                  <ActivityIcon className={`mx-auto mb-4 h-12 w-12 ${darkMode ? 'text-slate-500' : 'text-slate-300'}`} />
                  <p className="text-lg font-semibold">No transactions yet</p>
                  <p className={`mt-2 text-sm ${mutedTextClass}`}>Your account activity will appear here as soon as transactions are recorded.</p>
                </div>
              ) : (
                transactions.map((transaction) => {
                  const isDebit = transaction.type === 'debit';
                  const displayAmount = formatCurrency(Math.abs(Number(transaction.amount || 0)), transaction.currency || currency).replace(/^US\$/, '$');
                  const statusClass =
                    transaction.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : transaction.status === 'pending'
                        ? 'bg-amber-500/15 text-amber-200'
                        : 'bg-red-500/15 text-red-200';

                  return (
                    <button
                      key={transaction.id}
                      type="button"
                      onClick={() => setSelectedTransaction(transaction)}
                      className={`w-full rounded-3xl border p-4 text-left transition-transform hover:-translate-y-0.5 ${innerCardClass}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`rounded-2xl border border-white/10 p-3 ${isDebit ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                            {isDebit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">{transaction.description}</p>
                            <p className={`mt-1 text-xs ${mutedTextClass}`}>
                              {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'No timestamp'}
                            </p>
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <p className={`font-semibold ${isDebit ? 'text-red-400' : 'text-emerald-300'}`}>
                            {isDebit ? '-' : '+'}{displayAmount}
                          </p>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      <TransactionDetailsModal
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        fallbackCurrency={currency}
        onClose={() => setSelectedTransaction(null)}
      />
    </UserFeaturePageShell>
  );
}
