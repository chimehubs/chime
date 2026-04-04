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
  Wallet,
  Trash2
} from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { clearFreezeState, DEFAULT_TRANSACTION_LIMIT, DEFAULT_WITHDRAWAL_LIMIT, getAccountControlLimits, getActiveFreezeState } from '../user/userAccountState';


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
    avatarUrl?: string;
    profile: Profile;
    account?: Account | null;
  };
  type AccountCreationSnapshot = {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    nationality?: string;
    houseAddress?: string;
    occupation?: string;
    salaryRange?: string;
    accountType?: string;
    currency?: string;
    avatarUrl?: string;
    submittedAt?: string;
  };
  type AccountCreationDetail = {
    label: string;
    value: React.ReactNode;
    fullWidth?: boolean;
    mono?: boolean;
  };
  type AccountCreationSection = {
    title: string;
    description: string;
    items: AccountCreationDetail[];
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
  const [paymentDetailsSaved, setPaymentDetailsSaved] = useState('');
  const [userActionError, setUserActionError] = useState('');
  const [userActionSuccess, setUserActionSuccess] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isLiquidatingAccount, setIsLiquidatingAccount] = useState(false);
  const [transactionLimitInput, setTransactionLimitInput] = useState(String(DEFAULT_TRANSACTION_LIMIT));
  const [withdrawalLimitInput, setWithdrawalLimitInput] = useState(String(DEFAULT_WITHDRAWAL_LIMIT));
  const [freezeNote, setFreezeNote] = useState('');
  const [isSavingControls, setIsSavingControls] = useState(false);
  const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);

  const isProfileLiquidated = (profile: Profile, account?: Account | null) => {
    const lifecycle = profile.preferences?.accountLifecycle;
    const freezeState = getActiveFreezeState(profile.preferences);
    return Boolean(
      (lifecycle && typeof lifecycle === 'object' && !Array.isArray(lifecycle) && (lifecycle as Record<string, unknown>).isLiquidated === true) ||
      freezeState?.reason === 'account_liquidation' ||
      account?.status === 'CLOSED',
    );
  };

  const getUserStatus = (profile: Profile, account?: Account | null) => {
    if (isProfileLiquidated(profile, account)) return 'liquidated';

    const freezeState = getActiveFreezeState(profile.preferences);
    if (freezeState?.isFrozen) return 'frozen';

    const normalizedStatus = (profile.status || 'UNREGISTERED').toLowerCase();
    if (normalizedStatus === 'active') return 'active';
    if (normalizedStatus === 'restricted' || normalizedStatus === 'suspended') return 'restricted';
    return 'unregistered';
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'liquidated') return 'bg-slate-900 text-white';
    if (status === 'frozen') return 'bg-red-100 text-red-700';
    if (status === 'restricted') return 'bg-orange-100 text-orange-700';
    return 'bg-amber-100 text-amber-700';
  };

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
      transactions
        .filter((tx: Transaction) => tx.status === 'completed')
        .forEach((tx: Transaction) => {
        const amount = Number(tx.amount || 0);
        const current = balanceByAccount.get(tx.account_id) || 0;
        balanceByAccount.set(tx.account_id, tx.type === 'credit' ? current + amount : current - amount);
      });

      const rows = profiles.map((profile) => {
        const account = accounts.find((acc) => acc.user_id === profile.id) || null;
        const balanceValue = account ? (balanceByAccount.get(account.id) || 0) : 0;
        const currency = profile.currency || account?.currency || 'USD';
        const displayName = profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User';
        const status = getUserStatus(profile, account);
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
          avatarUrl: profile.avatar_url,
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

  React.useEffect(() => {
    if (!selectedUser) {
      setTransactionLimitInput(String(DEFAULT_TRANSACTION_LIMIT));
      setWithdrawalLimitInput(String(DEFAULT_WITHDRAWAL_LIMIT));
      setFreezeNote('');
      return;
    }

    const limits = getAccountControlLimits(selectedUser.profile.preferences);
    const freezeState = getActiveFreezeState(selectedUser.profile.preferences);
    setTransactionLimitInput(String(limits.transactionLimit));
    setWithdrawalLimitInput(String(limits.withdrawalLimit));
    setFreezeNote(freezeState?.adminNote || '');
  }, [selectedUser?.id, selectedUser?.profile?.updated_at]);

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
    setPaymentDetailsSaved('Payment details updated successfully.');
    window.setTimeout(() => setPaymentDetailsSaved(''), 3000);
  };

  const filteredUsers = users.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         row.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         row.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', INR: 'INR ', JPY: 'JPY ', AUD: 'A$', CAD: 'C$' };
    return symbols[currency] || '$';
  };

  const getAccountCreationSnapshot = (profile: Profile): AccountCreationSnapshot => {
    const raw = profile.preferences?.accountCreationForm;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as AccountCreationSnapshot;
  };

  const formatOptionalText = (value?: string | null) => {
    if (typeof value !== 'string') return 'Not provided';
    const trimmed = value.trim();
    return trimmed || 'Not provided';
  };

  const formatReadableDate = (value?: string | null) => {
    const raw = formatOptionalText(value);
    if (raw === 'Not provided') return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatLabelValue = (value?: string | null) => {
    const raw = formatOptionalText(value);
    if (raw === 'Not provided') return raw;
    return raw
      .toLowerCase()
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const getAccountCreationSections = (userRow: AdminUserRow): AccountCreationSection[] => {
    const snapshot = getAccountCreationSnapshot(userRow.profile);
    const middleName = formatOptionalText(snapshot.middleName || userRow.profile.middle_name);
    const firstName = formatOptionalText(snapshot.firstName || userRow.profile.first_name);
    const lastName = formatOptionalText(snapshot.lastName || userRow.profile.last_name);
    const fullName = [firstName, middleName, lastName]
      .filter((part) => part !== 'Not provided')
      .join(' ')
      .trim() || userRow.name;
    const photoUrl = formatOptionalText(snapshot.avatarUrl || userRow.profile.avatar_url) !== 'Not provided'
      ? String(snapshot.avatarUrl || userRow.profile.avatar_url)
      : '';

    return [
      {
        title: 'Personal Information',
        description: 'Identity details submitted during onboarding.',
        items: [
          { label: 'Full Name', value: fullName },
          { label: 'First Name', value: firstName },
          { label: 'Middle Name', value: middleName },
          { label: 'Last Name', value: lastName },
          { label: 'Gender', value: formatLabelValue(snapshot.gender || userRow.profile.gender) },
          { label: 'Date of Birth', value: formatReadableDate(snapshot.dateOfBirth || userRow.profile.date_of_birth) },
          { label: 'Nationality', value: formatOptionalText(snapshot.nationality || userRow.profile.nationality) },
          { label: 'House Address', value: formatOptionalText(snapshot.houseAddress || userRow.profile.house_address), fullWidth: true },
          { label: 'Phone Number', value: formatOptionalText(userRow.profile.phone) },
          { label: 'Email Address', value: formatOptionalText(userRow.profile.email) },
        ],
      },
      {
        title: 'Occupation & Income',
        description: 'Employment and income details from the form.',
        items: [
          { label: 'Occupation', value: formatOptionalText(snapshot.occupation || userRow.profile.occupation) },
          { label: 'Salary Range', value: formatOptionalText(snapshot.salaryRange || userRow.profile.salary_range) },
          { label: 'Form Submitted', value: formatReadableDate(snapshot.submittedAt || userRow.account?.created_at || userRow.profile.updated_at) },
        ],
      },
      {
        title: 'Account Setup',
        description: 'Requested banking setup and generated account records.',
        items: [
          { label: 'Account Type', value: formatLabelValue(snapshot.accountType || userRow.profile.primary_account_type || userRow.account?.account_type) },
          { label: 'Currency', value: formatOptionalText(snapshot.currency || userRow.profile.currency || userRow.account?.currency || userRow.currency) },
          { label: 'Account Number', value: formatOptionalText(userRow.account?.account_number), mono: true },
          { label: 'Routing Number', value: formatOptionalText(userRow.account?.routing_number), mono: true },
          {
            label: 'Uploaded Photo',
            value: photoUrl ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-black/5 shadow-sm">
                  <AvatarImage src={photoUrl} alt={`${userRow.name} profile photo`} className="object-cover" />
                  <AvatarFallback>{getUserInitials(userRow.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">Photo uploaded</span>
              </div>
            ) : 'Not provided',
            fullWidth: true,
          },
          { label: 'Security PIN', value: 'Stored securely and not visible to admins.', fullWidth: true },
        ],
      },
    ];
  };

  const renderAccountCreationDetails = (
    userRow: AdminUserRow,
    variant: 'compact' | 'full',
  ) => {
    const isCompact = variant === 'compact';
    const sections = getAccountCreationSections(userRow);

    return (
      <div className={isCompact ? 'space-y-4' : 'space-y-6'}>
        {sections.map((section) => (
          <div
            key={section.title}
            className={isCompact ? 'rounded-xl border border-border/70 bg-muted/20 p-4' : 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'}
          >
            <div className="mb-4">
              <h3 className={isCompact ? 'text-sm font-semibold text-foreground' : 'text-lg font-semibold text-slate-900'}>{section.title}</h3>
              <p className={isCompact ? 'mt-1 text-xs text-muted-foreground' : 'mt-1 text-sm text-slate-500'}>{section.description}</p>
            </div>
            <div className={`grid grid-cols-1 gap-3 ${isCompact ? '' : 'md:grid-cols-2 md:gap-4'}`}>
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className={`${item.fullWidth && !isCompact ? 'md:col-span-2' : ''} rounded-xl border ${isCompact ? 'border-border/60 bg-background/80 px-3 py-3' : 'border-slate-100 bg-slate-50/80 px-4 py-4'}`}
                >
                  <p className={isCompact ? 'text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground' : 'text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'}>{item.label}</p>
                  <div className={`${item.mono ? 'font-mono' : ''} ${isCompact ? 'mt-2 text-sm font-medium text-foreground break-words' : 'mt-2 text-base font-medium text-slate-900 break-words'}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const syncUpdatedProfile = (updatedProfile: Profile) => {
    setUsers((current) =>
      current.map((row) =>
        row.id === updatedProfile.id
          ? {
              ...row,
              profile: updatedProfile,
              status: getUserStatus(updatedProfile, row.account),
              avatarUrl: updatedProfile.avatar_url,
              currency: updatedProfile.currency || row.currency,
            }
          : row,
      ),
    );

    setSelectedUser((current) =>
      current?.id === updatedProfile.id
        ? {
            ...current,
            profile: updatedProfile,
            status: getUserStatus(updatedProfile, current.account),
            avatarUrl: updatedProfile.avatar_url,
            currency: updatedProfile.currency || current.currency,
          }
        : current,
    );
  };

  const syncUpdatedAccount = (updatedAccount: Account) => {
    setUsers((current) =>
      current.map((row) =>
        row.account?.id === updatedAccount.id
          ? {
              ...row,
              account: updatedAccount,
              status: getUserStatus(row.profile, updatedAccount),
            }
          : row,
      ),
    );

    setSelectedUser((current) =>
      current?.account?.id === updatedAccount.id
        ? {
            ...current,
            account: updatedAccount,
            status: getUserStatus(current.profile, updatedAccount),
          }
        : current,
    );
  };

  const handleSaveAccountControls = async () => {
    if (!selectedUser?.profile?.id) return;

    const transactionLimit = Number(transactionLimitInput);
    const withdrawalLimit = Number(withdrawalLimitInput);

    if (!Number.isFinite(transactionLimit) || transactionLimit <= 0) {
      setUserActionError('Enter a valid transaction limit.');
      return;
    }
    if (!Number.isFinite(withdrawalLimit) || withdrawalLimit <= 0) {
      setUserActionError('Enter a valid withdrawal limit.');
      return;
    }

    setIsSavingControls(true);
    setUserActionError('');
    setUserActionSuccess('');

    try {
      const nextPreferences = {
        ...(selectedUser.profile.preferences || {}),
        accountControls: {
          ...(selectedUser.profile.preferences?.accountControls || {}),
          transactionLimit,
          withdrawalLimit,
        },
      };

      const updatedProfile = await supabaseDbService.updateProfile(selectedUser.profile.id, {
        preferences: nextPreferences,
      });

      if (!updatedProfile) {
        setUserActionError('Failed to update account limits.');
        return;
      }

      syncUpdatedProfile(updatedProfile);
      setUserActionSuccess('User account limits updated successfully.');
    } finally {
      setIsSavingControls(false);
    }
  };

  const handleToggleFreeze = async () => {
    if (!selectedUser?.profile?.id) return;

    const freezeState = getActiveFreezeState(selectedUser.profile.preferences);
    setUserActionError('');
    setUserActionSuccess('');
    setIsTogglingFreeze(true);

    try {
      const preferences = selectedUser.profile.preferences || {};

      if (freezeState) {
        let nextPreferences = clearFreezeState(preferences);

        if (freezeState.reason === 'withdrawal_security_pin' && freezeState.pendingWithdrawalId) {
          const pendingTransactions = await supabaseDbService.getTransactions(selectedUser.profile.id, 500);
          const heldTransaction = pendingTransactions.find((transaction) => transaction.id === freezeState.pendingWithdrawalId);

          if (heldTransaction) {
            await supabaseDbService.updateTransaction(heldTransaction.id, {
              status: 'failed',
              metadata: {
                ...(heldTransaction.metadata || {}),
                requires_security_pin: false,
                admin_released_at: new Date().toISOString(),
                security_reset_required_restart: true,
              },
            });
          }
        }

        const updatedProfile = await supabaseDbService.updateProfile(selectedUser.profile.id, {
          status: 'ACTIVE' as any,
          preferences: nextPreferences,
        });

        if (!updatedProfile) {
          setUserActionError('Failed to unfreeze this account.');
          return;
        }

        syncUpdatedProfile(updatedProfile);
        setUserActionSuccess('User account unfrozen successfully.');
        return;
      }

      const nextPreferences = {
        ...preferences,
        accountFreeze: {
          isFrozen: true,
          reason: 'admin_action',
          createdAt: new Date().toISOString(),
          amount: 0,
          currency: selectedUser.profile.currency || selectedUser.currency || 'USD',
          adminNote: freezeNote.trim() || 'Temporarily frozen by admin account control.',
        },
      };

      const updatedProfile = await supabaseDbService.updateProfile(selectedUser.profile.id, {
        status: 'SUSPENDED' as any,
        preferences: nextPreferences,
      });

      if (!updatedProfile) {
        setUserActionError('Failed to freeze this account.');
        return;
      }

      syncUpdatedProfile(updatedProfile);
      setUserActionSuccess('User account frozen successfully.');
    } finally {
      setIsTogglingFreeze(false);
    }
  };

  const handleLiquidateAccount = async () => {
    if (!selectedUser?.profile?.id) return;

    setUserActionError('');
    setUserActionSuccess('');

    if (selectedUser.profile.role === 'admin') {
      setUserActionError('The admin account cannot be liquidated from user management.');
      return;
    }

    if (selectedUser.id === adminUser?.id) {
      setUserActionError('The active admin session cannot liquidate itself.');
      return;
    }

    if (!selectedUser.account?.id) {
      setUserActionError('This user does not have an active banking account to liquidate.');
      return;
    }

    if (selectedUser.status === 'liquidated') {
      setUserActionError('This user account has already been liquidated.');
      return;
    }

    const confirmed = window.confirm(
      `Liquidate ${selectedUser.name}'s account? This will close the banking account, cancel active cards, restrict access, and notify the user.`,
    );

    if (!confirmed) return;

    setIsLiquidatingAccount(true);

    try {
      const liquidatedAt = new Date().toISOString();
      const customNote = freezeNote.trim();
      const liquidationNote =
        customNote ||
        'Your account has been liquidated by your account manager with your prior consent. Banking access has been closed.';
      const nextPreferences = {
        ...clearFreezeState(selectedUser.profile.preferences || {}),
        accountFreeze: {
          isFrozen: true,
          reason: 'account_liquidation',
          createdAt: liquidatedAt,
          amount: selectedUser.balanceValue || 0,
          currency: selectedUser.profile.currency || selectedUser.currency || 'USD',
          adminNote: liquidationNote,
        },
        accountLifecycle: {
          ...((selectedUser.profile.preferences?.accountLifecycle &&
          typeof selectedUser.profile.preferences.accountLifecycle === 'object' &&
          !Array.isArray(selectedUser.profile.preferences.accountLifecycle)
            ? selectedUser.profile.preferences.accountLifecycle
            : {}) as Record<string, unknown>),
          isLiquidated: true,
          liquidatedAt,
          liquidatedBy: adminUser?.id || null,
          note: liquidationNote,
        },
      };

      const updatedProfile = await supabaseDbService.updateProfile(selectedUser.profile.id, {
        status: 'SUSPENDED' as any,
        preferences: nextPreferences,
      });

      if (!updatedProfile) {
        setUserActionError('Failed to update the user profile for liquidation.');
        return;
      }

      const updatedAccount = await supabaseDbService.updateAccount(selectedUser.account.id, {
        status: 'CLOSED',
      });

      if (!updatedAccount) {
        setUserActionError('Failed to close the banking account during liquidation.');
        return;
      }

      const cards = await supabaseDbService.getVirtualCards(selectedUser.profile.id);
      await Promise.all(
        cards
          .filter((card) => card.status !== 'CANCELLED')
          .map((card) => supabaseDbService.updateVirtualCard(card.id, { status: 'CANCELLED' })),
      );

      await Promise.all([
        supabaseDbService.createActivity({
          user_id: selectedUser.profile.id,
          type: 'profile',
          description: 'Account liquidated by account manager with user consent.',
          amount: selectedUser.balanceValue || 0,
        }),
        supabaseDbService.createNotification({
          user_id: selectedUser.profile.id,
          title: 'Account Liquidation Notice',
          message: `Your account has been liquidated by your account manager with your consent. Your banking access has been closed.${customNote ? ` ${customNote}` : ''} If you need a final statement or any further assistance, please contact customer support.`,
          type: 'info',
          read: false,
          path: '/chat',
        }),
      ]);

      syncUpdatedProfile(updatedProfile);
      syncUpdatedAccount(updatedAccount);
      setUserActionSuccess(`${selectedUser.name}'s account has been liquidated and the user has been notified.`);
    } finally {
      setIsLiquidatingAccount(false);
    }
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
  const frozenUsers = users.filter((u) => u.status === 'frozen').length;
  const liquidatedUsers = users.filter((u) => u.status === 'liquidated').length;

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

  const renderUserAvatar = (
    userRow: AdminUserRow,
    options?: { sizeClass?: string; textClass?: string; ringClass?: string },
  ) => {
    const gradient = getUserGradient(userRow.name);
    const initials = getUserInitials(userRow.name);

    return (
      <Avatar className={`${options?.sizeClass || 'h-12 w-12'} ${options?.ringClass || ''}`}>
        <AvatarImage src={userRow.avatarUrl} alt={userRow.name} className="object-cover" />
        <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-bold ${options?.textClass || 'text-lg'}`}>
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setUserActionError('');
    setUserActionSuccess('');

    if (selectedUser.profile.role === 'admin') {
      setUserActionError('The admin account cannot be deleted from user management.');
      return;
    }

    if (selectedUser.id === adminUser?.id) {
      setUserActionError('The active admin session cannot delete itself.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedUser.name} (${selectedUser.email}) permanently? This removes the user from authentication and deletes all linked records.`,
    );

    if (!confirmed) return;

    setIsDeletingUser(true);

    try {
      const result = await supabaseDbService.deleteUserAsAdmin(selectedUser.id);
      if (!result.success) {
        setUserActionError(result.error || 'User account could not be deleted.');
        return;
      }

      setUsers((current) => current.filter((item) => item.id !== selectedUser.id));
      setShowFullPanel(false);
      setSelectedUser(null);
      setUserActionSuccess(`${selectedUser.name} was deleted successfully.`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const isSelectedUserLiquidated = selectedUser?.status === 'liquidated';

  return (
    <AdminLayout
      title="User Management"
      subtitle={`${totalUsers} users | ${activeUsers} active | ${frozenUsers} frozen | ${liquidatedUsers} liquidated | ${unregisteredUsers} unregistered | ${restrictedUsers} restricted`}
    >
      {/* Admin Payment Details Section */}
      <Card className="mb-6 overflow-hidden border border-[#d6ebe4] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(237,249,244,0.98))] shadow-[0_18px_50px_rgba(0,163,122,0.08)]">
        <div className="border-b border-[#d9ece6] bg-[linear-gradient(135deg,rgba(0,163,122,0.08),rgba(0,128,128,0.05))] px-6 py-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0f3b33]">Payment Details Configuration</h2>
              <p className="text-sm text-[#53756d]">Set the default account details used in add-money flows and admin-managed payment instructions.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#bde4d8] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0a7a5a]">
              <Wallet className="h-4 w-4" />
              Admin Funding Profile
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#183f37]">Bank Name</label>
              <Input value={adminBankName} onChange={e => setAdminBankName(e.target.value)} placeholder="Chimehubs settlement bank" className="h-12 border-[#cfe5dd] bg-white/90" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#183f37]">Bank Account Number</label>
              <Input value={adminBankAccount} onChange={e => setAdminBankAccount(e.target.value)} placeholder="000123456789" className="h-12 border-[#cfe5dd] bg-white/90" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#183f37]">Account Holder Name</label>
              <Input value={adminBankHolder} onChange={e => setAdminBankHolder(e.target.value)} placeholder="Chimehubs Financial Services" className="h-12 border-[#cfe5dd] bg-white/90" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#183f37]">PayPal Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8d86]" />
                <Input value={adminPaypal} onChange={e => setAdminPaypal(e.target.value)} placeholder="payments@chimehubs.com" className="h-12 border-[#cfe5dd] bg-white/90 pl-10" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d7ebe4] bg-white/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f8d86]">Current Preview</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-[#d8ece5] bg-[#f5fbf8] px-4 py-3">
                <p className="text-xs text-[#6f8d86]">Bank Transfer</p>
                <p className="mt-2 text-sm font-semibold text-[#143a33]">{adminBankName || 'Bank name not set'}</p>
                <p className="mt-1 text-sm text-[#345750]">{adminBankAccount || 'Account number not set'}</p>
                <p className="mt-1 text-sm text-[#345750]">{adminBankHolder || 'Account holder not set'}</p>
              </div>
              <div className="rounded-2xl border border-[#d8ece5] bg-[#f5fbf8] px-4 py-3">
                <p className="text-xs text-[#6f8d86]">PayPal</p>
                <p className="mt-2 text-sm font-semibold text-[#143a33]">{adminPaypal || 'PayPal email not set'}</p>
              </div>
              {paymentDetailsSaved && (
                <div className="rounded-2xl border border-[#b8e7d7] bg-[#ecfbf5] px-4 py-3 text-sm font-medium text-[#0a7a5a]">
                  {paymentDetailsSaved}
                </div>
              )}
              <Button onClick={handleSavePaymentDetails} className="h-12 w-full bg-[#00b388] hover:bg-[#009670] text-white">Save Payment Details</Button>
            </div>
          </div>
        </div>
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
                <option value="frozen">Frozen</option>
                <option value="liquidated">Liquidated</option>
                <option value="restricted">Restricted</option>
                <option value="unregistered">Unregistered</option>
              </select>
          </div>
        </Card>

        {userActionError && (
          <Card className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {userActionError}
          </Card>
        )}

        {userActionSuccess && (
          <Card className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {userActionSuccess}
          </Card>
        )}

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
                              {renderUserAvatar(user, {
                                sizeClass: 'h-12 w-12 shrink-0',
                                ringClass: 'border border-black/5 shadow-sm',
                              })}
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
                                  <Badge className={getStatusBadgeClass(user.status)}>
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
                  <div className="mb-4 flex items-center gap-4">
                    {renderUserAvatar(selectedUser, {
                      sizeClass: 'h-16 w-16',
                      textClass: 'text-xl',
                      ringClass: 'border border-black/5 shadow-md',
                    })}
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold truncate">{selectedUser.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6 pb-6 border-b border-border">
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
                        <Badge className={getStatusBadgeClass(selectedUser.status)}>
                          {selectedUser.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-b border-border pb-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-[0.16em]">Account Creation Details</p>
                      {renderAccountCreationDetails(selectedUser, 'compact')}
                    </div>
                  </div>

                  <div className="space-y-4 border-b border-border pb-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-[0.16em]">Account Controls</p>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Transaction Limit</label>
                          <Input
                            type="number"
                            min="0"
                            value={transactionLimitInput}
                            onChange={(event) => setTransactionLimitInput(event.target.value)}
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Withdrawal Limit</label>
                          <Input
                            type="number"
                            min="0"
                            value={withdrawalLimitInput}
                            onChange={(event) => setWithdrawalLimitInput(event.target.value)}
                            placeholder="10000"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Account Control Note</label>
                          <textarea
                            value={freezeNote}
                            onChange={(event) => setFreezeNote(event.target.value)}
                            rows={3}
                            placeholder="Optional note shown to the user for a freeze or liquidation action."
                            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00b388]/30"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        onClick={handleSaveAccountControls}
                        disabled={isSavingControls || isSelectedUserLiquidated}
                        variant="outline"
                        className="w-full border-[#00b388]/30 text-[#0a7a5a] hover:bg-[#ecfbf5]"
                      >
                        {isSavingControls ? 'Saving Limits...' : 'Save Limits'}
                      </Button>
                      <Button
                        onClick={handleToggleFreeze}
                        disabled={isTogglingFreeze || isSelectedUserLiquidated}
                        variant="outline"
                        className={`w-full ${
                          selectedUser.status === 'frozen'
                            ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            : 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        {isTogglingFreeze
                          ? selectedUser.status === 'frozen'
                            ? 'Unfreezing...'
                            : 'Freezing...'
                          : isSelectedUserLiquidated
                            ? 'Account Liquidated'
                          : selectedUser.status === 'frozen'
                            ? 'Unfreeze Account'
                            : 'Freeze Account'}
                      </Button>
                      <Button
                        onClick={handleLiquidateAccount}
                        disabled={isLiquidatingAccount || isSelectedUserLiquidated || !selectedUser.account}
                        variant="outline"
                        className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <X className="mr-2 h-4 w-4" />
                        {isLiquidatingAccount
                          ? 'Liquidating Account...'
                          : isSelectedUserLiquidated
                            ? 'Account Liquidated'
                            : 'Liquidate Account'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowFundModal(true)}
                      disabled={isSelectedUserLiquidated}
                      className="w-full bg-[#00b388] hover:bg-[#009670] text-white"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Fund Account
                    </Button>
                    <Button
                      onClick={handleDeleteUser}
                      disabled={isDeletingUser || selectedUser.profile.role === 'admin' || selectedUser.id === adminUser?.id}
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isDeletingUser ? 'Deleting User...' : 'Delete User'}
                    </Button>
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
                {renderUserAvatar(selectedUser, {
                  sizeClass: 'h-32 w-32 border-4 border-white shadow-xl',
                  textClass: 'text-5xl',
                })}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl font-bold">{selectedUser.name}</h1>
                  <p className="text-white/80 text-lg mt-2">{selectedUser.email}</p>
                  <div className="mt-4">
                    <Badge className={
                      selectedUser.status === 'active' ? 'bg-white text-emerald-600' :
                      selectedUser.status === 'liquidated' ? 'bg-slate-900 text-white' :
                      selectedUser.status === 'frozen' ? 'bg-white text-red-600' :
                      selectedUser.status === 'restricted' ? 'bg-white text-orange-600' :
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

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Account Creation Details</h2>
              {renderAccountCreationDetails(selectedUser, 'full')}
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Account Controls</h2>
              <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Transaction Limit</label>
                    <Input
                      type="number"
                      min="0"
                      value={transactionLimitInput}
                      onChange={(event) => setTransactionLimitInput(event.target.value)}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Withdrawal Limit</label>
                    <Input
                      type="number"
                      min="0"
                      value={withdrawalLimitInput}
                      onChange={(event) => setWithdrawalLimitInput(event.target.value)}
                      placeholder="10000"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Account Control Note</label>
                  <textarea
                    value={freezeNote}
                    onChange={(event) => setFreezeNote(event.target.value)}
                    rows={4}
                    placeholder="Optional note shown to the user for a freeze or liquidation action."
                    className="w-full rounded-lg border border-border px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00b388]/30"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Button
                    onClick={handleSaveAccountControls}
                    disabled={isSavingControls || isSelectedUserLiquidated}
                    variant="outline"
                    className="border-[#00b388]/30 text-[#0a7a5a] hover:bg-[#ecfbf5]"
                  >
                    {isSavingControls ? 'Saving Limits...' : 'Save Limits'}
                  </Button>
                  <Button
                    onClick={handleToggleFreeze}
                    disabled={isTogglingFreeze || isSelectedUserLiquidated}
                    variant="outline"
                    className={
                      selectedUser.status === 'frozen'
                        ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        : 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                    }
                  >
                    {isTogglingFreeze
                      ? selectedUser.status === 'frozen'
                        ? 'Unfreezing...'
                        : 'Freezing...'
                      : isSelectedUserLiquidated
                        ? 'Account Liquidated'
                      : selectedUser.status === 'frozen'
                        ? 'Unfreeze Account'
                        : 'Freeze Account'}
                  </Button>
                </div>
                <Button
                  onClick={handleLiquidateAccount}
                  disabled={isLiquidatingAccount || isSelectedUserLiquidated || !selectedUser.account}
                  variant="outline"
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="w-5 h-5 mr-2" />
                  {isLiquidatingAccount
                    ? 'Liquidating Account...'
                    : isSelectedUserLiquidated
                      ? 'Account Liquidated'
                      : 'Liquidate Account'}
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pb-12">
              <Button onClick={() => setShowFundModal(true)} disabled={isSelectedUserLiquidated} className="flex-1 bg-[#00b388] hover:bg-[#009670] text-white text-lg py-6 font-semibold disabled:opacity-60">
                <Wallet className="w-5 h-5 mr-2" /> Fund Account
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteUser}
                disabled={isDeletingUser || selectedUser.profile.role === 'admin' || selectedUser.id === adminUser?.id}
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-lg py-6 font-semibold"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                {isDeletingUser ? 'Deleting User...' : 'Delete User'}
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



