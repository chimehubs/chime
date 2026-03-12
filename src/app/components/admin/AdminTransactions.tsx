import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Clock, User, DollarSign, MessageSquare, LogIn } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import AdminLayout from './AdminLayout';
import { supabaseDbService, type Activity, type Transaction, type Profile } from '../../../services/supabaseDbService';

interface AdminLogRow {
  id: string;
  actor: string;
  actorType: 'admin' | 'user';
  action: string;
  description: string;
  type: string;
  status: string;
  timestamp: string;
  details: string;
}

export default function AdminTransactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'auth' | 'deposit' | 'transfer' | 'funding' | 'support' | 'profile'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');
  const [logs, setLogs] = useState<AdminLogRow[]>([]);

  useEffect(() => {
    const loadLogs = async () => {
      const [profiles, transactions, activities] = await Promise.all([
        supabaseDbService.getAllProfiles(),
        supabaseDbService.getAllTransactions(),
        supabaseDbService.getAllActivities(),
      ]);

      const profileById = new Map(profiles.map((p) => [p.id, p]));

      const txLogs: AdminLogRow[] = transactions.map((tx: Transaction) => {
        const profile = profileById.get(tx.user_id) as Profile | undefined;
        const actorName = profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'User';
        const type = tx.type === 'credit' ? 'deposit' : 'transfer';
        const status = tx.status === 'completed' ? 'success' : tx.status;
        const timestamp = tx.created_at ? new Date(tx.created_at).toLocaleString() : 'N/A';
        return {
          id: `TX-${tx.id}`,
          actor: actorName,
          actorType: 'user',
          action: tx.type === 'credit' ? 'Deposit' : 'Transfer',
          description: tx.description || `${tx.type} transaction`,
          type,
          status,
          timestamp,
          details: JSON.stringify({
            amount: tx.amount,
            currency: tx.currency,
            account_id: tx.account_id,
            status: tx.status,
          }),
        };
      });

      const activityLogs: AdminLogRow[] = activities.map((activity: Activity) => {
        const profile = profileById.get(activity.user_id) as Profile | undefined;
        const actorName = profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'User';
        const timestamp = activity.created_at ? new Date(activity.created_at).toLocaleString() : 'N/A';
        return {
          id: `ACT-${activity.id}`,
          actor: actorName,
          actorType: 'user',
          action: activity.type || 'Activity',
          description: activity.description || 'User activity',
          type: activity.type || 'profile',
          status: 'success',
          timestamp,
          details: JSON.stringify({ amount: activity.amount || 0 }),
        };
      });

      const merged = [...txLogs, ...activityLogs].sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();
        return bTime - aTime;
      });

      setLogs(merged);
    };

    loadLogs();
  }, []);

  // Filter logic
  let filteredLog = [...logs];

  if (filterType !== 'all') {
    filteredLog = filteredLog.filter(log => log.type === filterType);
  }

  if (filterStatus !== 'all') {
    filteredLog = filteredLog.filter(log => log.status === filterStatus);
  }

  if (searchQuery) {
    filteredLog = filteredLog.filter(log =>
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (sortBy === 'oldest') {
    filteredLog.reverse();
  }

  // Calculate statistics
  const stats = useMemo(() => ({
    totalActions: filteredLog.length,
    successfulActions: filteredLog.filter(log => log.status === 'success').length,
    pendingActions: filteredLog.filter(log => log.status === 'pending').length,
    failedActions: filteredLog.filter(log => log.status === 'failed').length
  }), [filteredLog]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'auth': return <LogIn className="w-4 h-4" />;
      case 'deposit': return <DollarSign className="w-4 h-4" />;
      case 'transfer': return <DollarSign className="w-4 h-4" />;
      case 'funding': return <DollarSign className="w-4 h-4" />;
      case 'support': return <MessageSquare className="w-4 h-4" />;
      case 'profile': return <User className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <AdminLayout title="Activity History">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Actions', value: stats.totalActions, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Successful', value: stats.successfulActions, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending', value: stats.pendingActions, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Failed', value: stats.failedActions, color: 'text-red-600', bg: 'bg-red-50' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`p-6 ${stat.bg}`}>
                <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by actor name, action, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                title="Filter by action type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-2 rounded-lg border border-border bg-background"
              >
                <option value="all">All Action Types</option>
                <option value="auth">Authentication</option>
                <option value="deposit">Deposits</option>
                <option value="transfer">Transfers/Send Money</option>
                <option value="funding">Account Funding</option>
                <option value="support">Support/Chat</option>
                <option value="profile">Profile Updates</option>
              </select>
              <select
                title="Filter by status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 rounded-lg border border-border bg-background"
              >
                <option value="all">All Statuses</option>
                <option value="success">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select
                title="Sort activities"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 rounded-lg border border-border bg-background"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Activity Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="divide-y divide-border">
              {filteredLog.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No activities found matching your criteria
                </div>
              ) : (
                filteredLog.map((log, idx) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mt-1">
                        {getActivityIcon(log.type)}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm">{log.action}</h3>
                              <Badge className={`text-xs ${getStatusColor(log.status)}`}>
                                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getTypeLabel(log.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                            {log.timestamp}
                          </div>
                        </div>

                        {/* Actor Info */}
                        <div className="flex items-center gap-2 mb-3 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{log.actor}</span>
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {log.actorType === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="bg-muted/30 p-3 rounded text-xs text-muted-foreground font-mono">
                          {log.details}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
