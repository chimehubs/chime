import { useState } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Clock, DollarSign, X, Mail, Phone, Calendar, FileText } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import AdminLayout from './AdminLayout';
import { supabaseDbService, type Transaction, type Profile, type Account } from '../../../services/supabaseDbService';

interface DepositRow {
  id: string;
  userId: string;
  accountId: string;
  user: string;
  email: string;
  amount: string;
  amountValue: number;
  currency: string;
  method: string;
  status: string;
  created: string;
  reference: string;
}

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [showFullPanel, setShowFullPanel] = useState(false);
  const [balancesByAccount, setBalancesByAccount] = useState<Map<string, number>>(new Map());

  React.useEffect(() => {
    const loadDeposits = async () => {
      const [profiles, accounts, transactions] = await Promise.all([
        supabaseDbService.getAllProfiles(),
        supabaseDbService.getAllAccounts(),
        supabaseDbService.getAllTransactions(),
      ]);

      const profileById = new Map(profiles.map((p) => [p.id, p]));
      const accountById = new Map(accounts.map((a) => [a.id, a]));

      const balanceMap = new Map<string, number>();
      transactions.forEach((tx: Transaction) => {
        const current = balanceMap.get(tx.account_id) || 0;
        balanceMap.set(tx.account_id, tx.type === 'credit' ? current + Number(tx.amount) : current - Number(tx.amount));
      });
      setBalancesByAccount(balanceMap);

      const depositRows = transactions
        .filter((tx) => tx.type === 'credit')
        .map((tx) => {
          const profile = profileById.get(tx.user_id) as Profile | undefined;
          const account = accountById.get(tx.account_id) as Account | undefined;
          const userName = profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User';
          const currency = tx.currency || profile?.currency || account?.currency || 'USD';
          const amountValue = Number(tx.amount || 0);
          const method = (tx.description || '').toLowerCase().includes('paypal')
            ? 'PayPal'
            : (tx.description || '').toLowerCase().includes('gift')
            ? 'Gift Card'
            : 'Bank Transfer';

          return {
            id: tx.id,
            userId: tx.user_id,
            accountId: tx.account_id,
            user: userName,
            email: profile?.email || 'N/A',
            amount: `${getCurrencySymbol(currency)}${amountValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
            amountValue,
            currency,
            method,
            status: tx.status,
            created: tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'N/A',
            reference: tx.id,
          } as DepositRow;
        });

      setDeposits(depositRows);
    };

    loadDeposits();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusGradient = (userName: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-green-400 to-green-600'
    ];
    const hash = userName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'JPY': '¥',
      'AUD': 'A$',
      'CAD': 'C$'
    };
    return symbols[currency] || '$';
  };

  const handleApprove = async (id: string) => {
    if (!selected) return;

    await supabaseDbService.updateTransaction(id, { status: 'completed' });

    const currencySymbol = getCurrencySymbol(selected.currency || 'USD');
    const currentBalance = balancesByAccount.get(selected.accountId) || 0;
    const newBalanceValue = currentBalance + selected.amountValue;
    const formattedNewBalance = `${currencySymbol}${newBalanceValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

    await supabaseDbService.createNotification({
      user_id: selected.userId,
      title: 'Deposit Approved ✓',
      message: `You have received ${selected.amount} from your deposit via ${selected.method}. Your new balance is ${formattedNewBalance}.`,
      type: 'credit',
      read: false,
      path: '/activity',
    });

    await supabaseDbService.createActivity({
      user_id: selected.userId,
      type: 'deposit',
      description: `Deposit approved via ${selected.method}`,
      amount: selected.amountValue,
    });

    setDeposits((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'completed' } : d)));
    setStatusMsg(`✓ Deposit ${id} approved. Credit alert sent to ${selected.user}.`);
    setTimeout(() => {
      setStatusMsg('');
      setShowFullPanel(false);
      setSelectedDeposit(null);
    }, 2500);
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      setStatusMsg('Please enter a rejection reason');
      return;
    }

    if (!selected) return;

    await supabaseDbService.updateTransaction(id, { status: 'failed' });

    await supabaseDbService.createNotification({
      user_id: selected.userId,
      title: 'Deposit Rejected ✗',
      message: `Your deposit of ${selected.amount} via ${selected.method} has been rejected. Reason: ${rejectionReason}`,
      type: 'failed',
      read: false,
      path: '/activity',
    });

    await supabaseDbService.createActivity({
      user_id: selected.userId,
      type: 'deposit',
      description: `Deposit rejected. Reason: ${rejectionReason}`,
      amount: selected.amountValue,
    });

    setDeposits((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'failed' } : d)));
    setStatusMsg(`✗ Deposit ${id} rejected. Notification sent to ${selected.user}`);
    setRejectionReason('');
    setTimeout(() => {
      setStatusMsg('');
      setShowFullPanel(false);
      setSelectedDeposit(null);
    }, 2500);
  };

  const stats = [
    { label: 'Pending Deposits', value: deposits.filter((d) => d.status === 'pending').length, icon: Clock, color: 'text-amber-600' },
    { label: 'Total Approved', value: deposits.filter((d) => d.status === 'completed').length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Total Rejected', value: deposits.filter((d) => d.status === 'failed').length, icon: XCircle, color: 'text-red-600' },
    { label: 'Avg. Deposit', value: deposits.length ? `$${(deposits.reduce((sum, d) => sum + d.amountValue, 0) / deposits.length).toFixed(2)}` : '$0.00', icon: DollarSign, color: 'text-blue-600' }
  ];

  const selected = deposits.find(d => d.id === selectedDeposit);

  return (
    <AdminLayout title="Deposits">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-semibold"
          >
            {statusMsg}
          </motion.div>
        )}

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Deposit Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {deposits.map(deposit => (
              <motion.button
                key={deposit.id}
                onClick={() => {
                  setSelectedDeposit(deposit.id);
                  setShowFullPanel(true);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="text-left"
              >
                <Card className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedDeposit === deposit.id && showFullPanel
                    ? 'border-[#00b388] bg-[#e6f9f4]'
                    : 'border-border hover:border-[#00b388]/50'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{deposit.user}</p>
                        <p className="text-xs text-muted-foreground mt-1">{deposit.email}</p>
                      </div>
                      <Badge className={getStatusColor(deposit.status)}>
                        {deposit.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <p className="font-bold text-green-600">{deposit.amount}</p>
                      <p className="text-xs text-muted-foreground">{deposit.method}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{deposit.created}</p>
                  </div>
                </Card>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-Page Review Panel */}
      <AnimatePresence>
        {showFullPanel && selected && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-black/50 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-1/2 flex items-stretch"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-background w-full overflow-y-auto"
            >
              {/* Header with User Info */}
              <div className={`bg-gradient-to-r ${getStatusGradient(selected.user)} px-6 py-8 text-white sticky top-0`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{selected.user}</h2>
                    <p className="text-white/80 text-sm mt-2">{selected.email}</p>
                  </div>
                  <button
                    onClick={() => setShowFullPanel(false)}
                    title="Close panel"
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Deposit Details */}
                <div>
                  <h3 className="text-lg font-bold mb-4">Deposit Details</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Deposit ID</p>
                      <p className="font-medium">{selected.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Reference</p>
                      <p className="font-medium">{selected.reference}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Amount</p>
                      <p className="font-bold text-lg text-green-600">{selected.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Status</p>
                      <Badge className={getStatusColor(selected.status)}>
                        {selected.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Method</p>
                      <p className="font-medium">{selected.method}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Created</p>
                      <p className="font-medium text-sm">{selected.created}</p>
                    </div>
                  </div>
                </div>

                {/* User Information */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    User Information
                  </h3>
                  <div className="space-y-3 bg-gray-50/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{selected.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">Not provided</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="font-medium">{selected.created}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media Display - Uploaded Image */}
                <div>
                  <h3 className="text-lg font-bold mb-4">Upload Evidence</h3>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 bg-gray-50/50">
                    <div className="text-center py-8">
                      <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No upload evidence provided</p>
                    </div>
                  </div>
                </div>

                {/* Action Section */}
                {selected.status === 'pending' && (
                  <div className="space-y-4 border-t pt-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Rejection Reason (Optional)</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        title="Rejection reason"
                        placeholder="Explain why this deposit is being rejected..."
                        className="w-full p-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00b388]"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selected.id)}
                        className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve Deposit
                      </button>
                      <button
                        onClick={() => handleReject(selected.id)}
                        className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject Deposit
                      </button>
                    </div>
                  </div>
                )}

                {selected.status !== 'pending' && (
                  <div className={`p-4 rounded-lg text-center ${
                    selected.status === 'completed' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <p className="text-sm font-semibold">
                      This deposit has already been {selected.status}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop Click to Close */}
      {showFullPanel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowFullPanel(false)}
          className="fixed inset-0 z-40"
        />
      )}
    </AdminLayout>
  );
}
