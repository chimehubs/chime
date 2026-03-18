import { useState } from 'react';
import React from 'react';
import { motion } from 'motion/react';
import AdminLayout from './AdminLayout';
import { supabaseDbService, type Account, type Profile, type Transaction } from '../../../services/supabaseDbService';
import { useAuthContext } from '../../../context/AuthProvider';
import {
  Search,
  Eye,
  CheckCircle,
  X,
  Send,
  ArrowLeft,
  UserCheck,
  Mail,
  Calendar,
  Wallet
} from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';


export default function AdminUsers() {
  const { user: adminUser } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  type AdminUserRow = {
    id: string;
    name: string;
    email: string;
    status: string;
    balance: string;
    balanceValue: number;
    currency: string;
    joined: string;
    profile: Profile;
    account?: Account | null;
  };

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [showFullPanel, setShowFullPanel] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('');
  const [senderAccountNumber, setSenderAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [fundingMethod, setFundingMethod] = useState('bank_transfer');
  const [transferMessage, setTransferMessage] = useState('');
  const [fundError, setFundError] = useState('');
  const [fundSuccess, setFundSuccess] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [adminPrefs, setAdminPrefs] = useState<Record<string, any>>({});

  React.useEffect(() => {
    const loadAdminPrefs = async () => {
      if (!adminUser?.id) return;
      const profile = await supabaseDbService.getProfile(adminUser.id);
      const prefs = profile?.preferences || {};
      setAdminPrefs(prefs);
      const details = prefs.adminPaymentDetails || {};
      setAdminBankName(details.bankName || '');
      setAdminBankAccount(details.bankAccount || '');
      setAdminBankHolder(details.bankHolder || '');
      setAdminPaypal(details.paypal || '');
    };
    loadAdminPrefs();
  }, [adminUser?.id]);

  React.useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      const [profiles, accounts, transactions] = await Promise.all([
        supabaseDbService.getAllProfiles(),
        supabaseDbService.getAllAccounts(),
        supabaseDbService.getAllTransactions()
      ]);

      const balanceByAccount = new Map<string, number>();
      transactions.forEach((tx: Transaction) => {
        const amount = Number(tx.amount || 0);
        const current = balanceByAccount.get(tx.account_id) || 0;
        balanceByAccount.set(tx.account_id, tx.type === 'credit' ? current + amount : current - amount);
      });

      const rows = profiles.map((profile) => {
        const account = accounts.find((acc) => acc.user_id === profile.id) || null;
        const balanceValue = account ? (balanceByAccount.get(account.id) || 0) : 0;
        const currency = profile.currency || account?.currency || 'USD';
        const displayName = profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User';
        const normalizedStatus = (profile.status || 'UNREGISTERED').toLowerCase();
        const status = normalizedStatus === 'active' ? 'active' : normalizedStatus === 'restricted' ? 'restricted' : 'unregistered';
        const joined = profile.created_at ? profile.created_at.split('T')[0] : 'N/A';
        return {
          id: profile.id,
          name: displayName,
          email: profile.email,
          status,
          balance: `${getCurrencySymbol(currency)}${balanceValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
          balanceValue,
          currency,
          joined,
          profile,
          account
        } as AdminUserRow;
      });

      if (!mounted) return;
      setUsers(rows);
    };

    loadUsers();
    const interval = window.setInterval(loadUsers, 10000);
    const onFocus = () => loadUsers();
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [adminUser?.id]);

  // Admin payment details state
  const [adminBankName, setAdminBankName] = useState('');
  const [adminBankAccount, setAdminBankAccount] = useState('');
  const [adminBankHolder, setAdminBankHolder] = useState('');
  const [adminPaypal, setAdminPaypal] = useState('');

  const handleSavePaymentDetails = async () => {
    if (!adminUser?.id) return;
    await supabaseDbService.updateProfile(adminUser.id, {
      preferences: {
        ...adminPrefs,
        adminPaymentDetails: {
          bankName: adminBankName,
          bankAccount: adminBankAccount,
          bankHolder: adminBankHolder,
          paypal: adminPaypal
        }
      }
    });
    setAdminPrefs((prev) => ({
      ...prev,
      adminPaymentDetails: {
        bankName: adminBankName,
        bankAccount: adminBankAccount,
        bankHolder: adminBankHolder,
        paypal: adminPaypal
      }
    }));
    alert('Payment details saved!');
  };

  const filteredUsers = users.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         row.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         row.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', AUD: 'A$', CAD: 'C$' };
    return symbols[currency] || '$';
  };

  const handleFundUser = async () => {
    setFundError('');
    setFundSuccess('');

    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      setFundError('Please enter a valid amount');
      return;
    }
    if (!senderName.trim()) {
      setFundError('Please enter sender full name');
      return;
    }
    if (!senderBank.trim()) {
      setFundError('Please enter sender bank name');
      return;
    }
    if (!senderAccountNumber.trim()) {
      setFundError('Please enter sender account number');
      return;
    }
    if (!selectedUser?.profile || !selectedUser.account) {
      setFundError('User account not found');
      return;
    }

    setIsFunding(true);
    try {
      const userCurrency = selectedUser.profile.currency || 'USD';
      const numAmount = parseFloat(fundAmount);
      const currencySymbol = getCurrencySymbol(userCurrency);
      const newBalanceValue = (selectedUser.balanceValue || 0) + numAmount;
      const formattedBalance = `${currencySymbol}${newBalanceValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

      const transactionId = `TXN-${Date.now()}`;
      const tx = await supabaseDbService.createTransaction({
        user_id: selectedUser.profile.id,
        account_id: selectedUser.account.id,
        type: 'credit',
        amount: numAmount,
        description: `Credit from ${senderName} (${senderBank})`,
        currency: userCurrency,
        status: 'completed',
        metadata: {
          sender_name: senderName,
          sender_bank: senderBank,
          sender_account_number: senderAccountNumber,
          funding_method: fundingMethod,
          routing_number: routingNumber || null,
          transfer_message: transferMessage || null,
        },
      });
      if (!tx) {
        setFundError('Failed to fund account. Please verify admin permissions and try again.');
        return;
      }

      const activity = await supabaseDbService.createActivity({
        user_id: selectedUser.profile.id,
        type: 'credit',
        description: `Credited from ${senderName} - ${senderBank}`,
        amount: numAmount,
      });
      if (!activity) {
        setFundError('Funding created but activity log failed. Please refresh.');
      }

      const notification = await supabaseDbService.createNotification({
        user_id: selectedUser.profile.id,
        title: 'Credit Alert',
        message: `Your account was credited with ${currencySymbol}${numAmount.toFixed(2)} from ${senderName} (${senderBank}). New balance: ${formattedBalance}`,
        type: 'credit',
        read: false,
        path: '/activity',
      });
      if (!notification) {
        setFundError('Funding created but notification failed. Please refresh.');
      }

      const updatedUsers = users.map(u =>
        u.profile.id === selectedUser.profile.id
          ? { ...u, balanceValue: newBalanceValue, balance: formattedBalance }
          : u
      );
      setUsers(updatedUsers);
      setSelectedUser(updatedUsers.find(u => u.profile.id === selectedUser.profile.id) || null);

      setFundSuccess(`Successfully funded ${currencySymbol}${numAmount.toFixed(2)} to ${selectedUser.profile.name || selectedUser.profile.email}. Credit notification has been sent to their account. Transaction ID: ${transactionId}`);

      setTimeout(() => {
        setFundAmount('');
        setSenderName('');
        setSenderBank('');
        setSenderAccountNumber('');
        setRoutingNumber('');
        setTransferMessage('');
        setFundingMethod('bank_transfer');
        setShowFundModal(false);
        setFundSuccess('');
      }, 3000);
    } catch (err) {
      setFundError(err instanceof Error ? err.message : 'Failed to fund account. Please try again.');
    } finally {
      setIsFunding(false);
    }
  };

  const totalUsers = users.length;
  const unregisteredUsers = users.filter((u) => u.status === 'unregistered').length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const restrictedUsers = users.filter((u) => u.status === 'restricted').length;

  // Helper: map a user name to a gradient string
  const getUserGradient = (name: string) => {
    const gradients = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-green-400 to-green-600',
      'from-yellow-400 to-yellow-600',
      'from-indigo-400 to-indigo-600',
      'from-cyan-400 to-cyan-600',
      'from-rose-400 to-rose-600'
    ];
    const hash = (name?.charCodeAt(0) || 0) + (name?.charCodeAt(name.length - 1) || 0);
    return gradients[hash % gradients.length];
  };

  // Helper: extract initials from a name
  const getUserInitials = (name: string) => {
    return (name || '')
      .split(' ')
      .map(n => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AdminLayout
      title="User Management"
      subtitle={`${totalUsers} users â€¢ ${activeUsers} active â€¢ ${unregisteredUsers} unregistered â€¢ ${restrictedUsers} restricted`}
    >
      {/* Admin Payment Details Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Payment Details Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bank Name</label>
            <Input value={adminBankName} onChange={e => setAdminBankName(e.target.value)} placeholder="Bank Name" className="mb-2" />
            <label className="block text-sm font-medium mb-1">Bank Account Number</label>
            <Input value={adminBankAccount} onChange={e => setAdminBankAccount(e.target.value)} placeholder="Account Number" className="mb-2" />
            <label className="block text-sm font-medium mb-1">Account Holder Name</label>
            <Input value={adminBankHolder} onChange={e => setAdminBankHolder(e.target.value)} placeholder="Account Holder" className="mb-2" />
          </div> 
          <div>
            <label className="block text-sm font-medium mb-1">PayPal Email</label>
            <Input value={adminPaypal} onChange={e => setAdminPaypal(e.target.value)} placeholder="PayPal Email" className="mb-2" />
          </div>
        </div>
        <Button onClick={handleSavePaymentDetails} className="mt-4 bg-[#00b388] hover:bg-[#009670] text-white">Save Payment Details</Button>
      </Card>
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-background border border-border text-sm"
              title="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="restricted">Restricted</option>
              <option value="unregistered">Unregistered</option>
            </select>
          </div>
        </Card>

        {/* Users Grid and Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {filteredUsers.length === 0 ? (
                <Card className="p-8 text-center">
                  <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                </Card>
              ) : (
                filteredUsers.map((user, index) => {
                  const gradient = getUserGradient(user.name);
                  const initials = getUserInitials(user.name);

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        onClick={() => { setSelectedUser(user); setShowFullPanel(true); }}
                        className="p-5 cursor-pointer transition-all hover:shadow-lg border-0"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>{initials}</div>
                              <div>
                                <h3 className="text-lg font-semibold">{user.name}</h3>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">User ID</p>
                                <p className="text-sm font-mono">{user.id}</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Balance</p>
                                <p className="text-lg font-bold text-[#00b388]">{user.balance}</p>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                                  <Badge className={
                                    user.status === 'active' ? 'bg-green-100 text-green-700' :
                                    user.status === 'restricted' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }>
                                    {user.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Joined</p>
                                  <p className="text-sm font-medium">{user.joined}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </div>

          {/* User Control Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-1"
          >
            {selectedUser ? (
              <Card className="p-6 space-y-6 md:sticky md:top-32">
                {/* User Profile */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">{selectedUser.name}</h3>
                  <div className="space-y-3 mb-6 pb-6 border-b border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <p className="text-sm font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">User ID</p>
                      <p className="text-sm font-mono font-medium">{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                      <p className="text-2xl font-bold text-[#00b388]">{selectedUser.balance}</p>
                      <p className="text-xs text-muted-foreground mt-1">{selectedUser.currency}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge className={
                          selectedUser.status === 'active' ? 'bg-green-100 text-green-700' :
                          selectedUser.status === 'restricted' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {selectedUser.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <Eye className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a user to view their control panel</p>
              </Card>
            )}
          </motion.div>
        </div>

      {/* Full-Page User Control Panel */}
      {showFullPanel && selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white overflow-auto"
        >
          {/* Gradient Header */}
          <div className={`bg-gradient-to-br ${getUserGradient(selectedUser.name)} relative overflow-hidden py-12 px-6`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
              <button
                onClick={() => { setShowFullPanel(false); setSelectedUser(null); }}
                className="mb-6 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-white">
                <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getUserGradient(selectedUser.name)} flex items-center justify-center font-bold text-6xl border-4 border-white shadow-xl`}>
                  {getUserInitials(selectedUser.name)}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl font-bold">{selectedUser.name}</h1>
                  <p className="text-white/80 text-lg mt-2">{selectedUser.email}</p>
                  <div className="mt-4">
                    <Badge className={
                      selectedUser.status === 'active' ? 'bg-white text-emerald-600' :
                      selectedUser.status === 'restricted' ? 'bg-white text-red-600' :
                      'bg-white text-amber-600'
                    }>
                      {selectedUser.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-muted-foreground text-sm uppercase tracking-wide font-semibold">Current Balance</p>
                <p className="text-3xl font-bold text-[#00b388] mt-2">{selectedUser.balance}</p>
              </div>
              <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-muted-foreground text-sm uppercase tracking-wide font-semibold">Account Status</p>
                <p className="text-lg font-semibold mt-2 capitalize">{selectedUser.status.replace('_', ' ')}</p>
              </div>
              <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-muted-foreground text-sm uppercase tracking-wide font-semibold">Member Since</p>
                <p className="text-lg font-semibold mt-2">{selectedUser.joined}</p>
              </div>
            </div>

            {/* Details Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Account Information</h2>
              <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <Mail className="w-6 h-6 text-[#00b388]" />
                  <div>
                    <p className="text-sm text-muted-foreground font-semibold">Email Address</p>
                    <p className="text-lg font-medium text-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <UserCheck className="w-6 h-6 text-[#00b388]" />
                  <div>
                    <p className="text-sm text-muted-foreground font-semibold">User ID</p>
                    <p className="text-lg font-mono font-medium text-foreground">{selectedUser.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Calendar className="w-6 h-6 text-[#00b388]" />
                  <div>
                    <p className="text-sm text-muted-foreground font-semibold">Account Created</p>
                    <p className="text-lg font-medium text-foreground">{selectedUser.joined}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pb-12">
              <Button onClick={() => setShowFundModal(true)} className="flex-1 bg-[#00b388] hover:bg-[#009670] text-white text-lg py-6 font-semibold">
                <Wallet className="w-5 h-5 mr-2" /> Fund Account
              </Button>
              <Button variant="outline" onClick={() => { setShowFullPanel(false); setSelectedUser(null); }} className="flex-1 text-lg py-6 font-semibold">
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      )}
      {showFundModal && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          onClick={() => setShowFundModal(false)}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#00b388] to-[#00a99d] px-6 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Fund Account</h2>
                <p className="text-white/80 text-sm mt-1">{selectedUser?.name}</p>
              </div>
              <button
                onClick={() => setShowFundModal(false)}
                title="Close modal"
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">

              {fundError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
                >
                  <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{fundError}</p>
                </motion.div>
              )}
              {fundSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{fundSuccess}</p>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-2">Sender Name *</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    title="Sender full name"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Bank Name *</label>
                  <Input
                    type="text"
                    placeholder="Chase Bank"
                    value={senderBank}
                    onChange={(e) => setSenderBank(e.target.value)}
                    title="Sender bank"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-2">Account Number *</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={senderAccountNumber}
                    onChange={(e) => setSenderAccountNumber(e.target.value)}
                    title="Account number"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Routing Number</label>
                  <Input
                    type="text"
                    placeholder="021000021"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    title="Routing number (optional)"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Funding Method</label>
                <select
                  value={fundingMethod}
                  onChange={(e) => setFundingMethod(e.target.value)}
                  title="Select a funding method"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00b388]"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="wire_transfer">Wire Transfer</option>
                  <option value="ach_transfer">ACH Transfer</option>
                  <option value="international_wire">International Wire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Amount</label>
                <div className="flex items-center">
                  <span className="text-xl font-bold text-[#00b388] mr-2">{getCurrencySymbol(selectedUser?.currency || 'USD')}</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    title="Amount to fund"
                    step="0.01"
                    min="0"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Transfer Message</label>
                <textarea
                  placeholder="Add a message for the user (optional)"
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  title="Transfer message"
                  className="w-full p-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00b388]/50 resize-none"
                  rows={3}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Current Balance</span>
                  <span className="text-sm font-semibold">{selectedUser?.balance}</span>
                </div>
                {fundAmount && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Transfer Amount</span>
                      <span className="text-sm font-semibold text-green-600">+${parseFloat(fundAmount || '0').toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">New Balance</span>
                      <span className="text-lg font-bold text-[#00b388]">
                        ${(parseFloat(selectedUser?.balance?.replace(/[$,]/g, '') || '0') + parseFloat(fundAmount || '0')).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-muted/50 px-6 py-4 flex gap-3 border-t border-border">
              <button
                onClick={() => setShowFundModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleFundUser}
                disabled={!fundAmount || !senderName || isFunding}
                className="flex-1 px-4 py-2 bg-[#00b388] text-white rounded-lg hover:bg-[#009670] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isFunding ? 'Sending...' : 'Send Funds'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
    </AdminLayout>
  );
}


