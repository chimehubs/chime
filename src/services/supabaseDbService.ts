import { getClient } from './supabaseClient';

export type UserStatus = 'UNREGISTERED' | 'ACTIVE' | 'SUSPENDED';
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string;
  name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  nationality?: string;
  gender?: string;
  date_of_birth?: string;
  house_address?: string;
  occupation?: string;
  salary_range?: string;
  primary_account_type?: 'CHECKING' | 'SAVINGS';
  currency?: string;
  avatar_url?: string;
  chat_last_seen_at?: string | null;
  preferences?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  user_id: string;
  account_number: string;
  routing_number: string;
  account_type: 'CHECKING' | 'SAVINGS';
  currency: string;
  status: 'ACTIVE' | 'CLOSED' | 'SUSPENDED';
  created_at?: string;
}

export interface VirtualCard {
  id: string;
  user_id: string;
  account_id: string;
  card_number: string;
  expiry_date: string;
  cvv: string;
  status: 'ACTIVE' | 'FROZEN' | 'CANCELLED';
  daily_limit: number;
  monthly_limit: number;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface Activity {
  id: string;
  user_id: string;
  type: string;
  description: string;
  amount?: number;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title?: string;
  message: string;
  type?: string;
  path?: string;
  read: boolean;
  created_at?: string;
}

export interface Draft {
  id: string;
  user_id: string;
  type: 'add_money' | 'send_money';
  payload: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ChatThread {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  user_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  attachment_url?: string;
  read: boolean;
  read_at?: string | null;
  created_at?: string;
}

class SupabaseDbService {
  private logError(operation: string, error: unknown) {
    if (import.meta.env.DEV && error) {
      console.error(`[supabaseDbService] ${operation}`, error);
    }
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      this.logError('getProfile', error);
      return null;
    }
    return data as Profile;
  }

  async upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.from('profiles').upsert(profile).select().single();
    if (error) return null;
    return data as Profile;
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) {
      this.logError('updateProfile', error);
      return null;
    }
    return data as Profile;
  }

  async getAccounts(userId: string): Promise<Account[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      this.logError('getAccounts', error);
      return [];
    }
    return (data || []) as Account[];
  }

  async getAllProfiles(): Promise<Profile[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      this.logError('getAllProfiles', error);
      return [];
    }
    return (data || []) as Profile[];
  }

  async getAllAccounts(): Promise<Account[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      this.logError('getAllAccounts', error);
      return [];
    }
    return (data || []) as Account[];
  }

  async getAccountByUser(userId: string): Promise<Account | null> {
    const accounts = await this.getAccounts(userId);
    return accounts[0] || null;
  }

  async getVirtualCards(userId: string): Promise<VirtualCard[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('virtual_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []) as VirtualCard[];
  }

  async updateVirtualCard(cardId: string, updates: Partial<VirtualCard>): Promise<VirtualCard | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('virtual_cards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();
    if (error) return null;
    return data as VirtualCard;
  }

  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('accounts')
      .update(updates)
      .eq('id', accountId)
      .select()
      .single();
    if (error) {
      this.logError('updateAccount', error);
      return null;
    }
    return data as Account;
  }

  async getTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      this.logError('getTransactions', error);
      return [];
    }
    return (data || []) as Transaction[];
  }

  async getAllTransactions(filters?: { type?: 'credit' | 'debit'; status?: 'completed' | 'pending' | 'failed' }): Promise<Transaction[]> {
    const client = getClient();
    if (!client) return [];
    let query = client.from('transactions').select('*').order('created_at', { ascending: false });
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) {
      this.logError('getAllTransactions', error);
      return [];
    }
    return (data || []) as Transaction[];
  }

  async createTransaction(payload: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('transactions')
      .insert(payload)
      .select()
      .single();
    if (error) {
      this.logError('createTransaction', error);
      return null;
    }
    return data as Transaction;
  }

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();
    if (error) return null;
    return data as Transaction;
  }

  async getActivities(userId: string, limit = 50): Promise<Activity[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []) as Activity[];
  }

  async getAllActivities(limit = 200): Promise<Activity[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []) as Activity[];
  }

  async createActivity(payload: Omit<Activity, 'id' | 'created_at'>): Promise<Activity | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('activities')
      .insert(payload)
      .select()
      .single();
    if (error) return null;
    return data as Activity;
  }

  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []) as Notification[];
  }

  async createNotification(payload: Omit<Notification, 'id' | 'created_at'>): Promise<Notification | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('notifications')
      .insert(payload)
      .select()
      .single();
    if (error) return null;
    return data as Notification;
  }

  async markNotificationsRead(userId: string): Promise<void> {
    const client = getClient();
    if (!client) return;
    await client.from('notifications').update({ read: true }).eq('user_id', userId);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const client = getClient();
    if (!client) return;
    await client.from('notifications').update({ read: true }).eq('id', notificationId);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const client = getClient();
    if (!client) return;
    await client.from('notifications').delete().eq('id', notificationId);
  }

  async getDraft(userId: string, type: Draft['type']): Promise<Draft | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('drafts')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .maybeSingle();
    if (error) return null;
    return data as Draft;
  }

  async upsertDraft(userId: string, type: Draft['type'], payload: Record<string, any>): Promise<Draft | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('drafts')
      .upsert({ user_id: userId, type, payload })
      .select()
      .single();
    if (error) return null;
    return data as Draft;
  }

  async deleteDraft(userId: string, type: Draft['type']): Promise<void> {
    const client = getClient();
    if (!client) return;
    await client.from('drafts').delete().eq('user_id', userId).eq('type', type);
  }

  async getOrCreateChatThread(userId: string): Promise<ChatThread | null> {
    const client = getClient();
    if (!client) return null;

    const { data: existing, error: existingError } = await client
      .from('chat_threads')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (existingError) {
      this.logError('getOrCreateChatThread.selectExisting', existingError);
    }
    if (existing) return existing as ChatThread;

    const { data, error } = await client
      .from('chat_threads')
      .insert({ user_id: userId, status: 'open' })
      .select()
      .single();
    if (!error && data) return data as ChatThread;

    if (error?.code && ['23505', '409'].includes(String(error.code))) {
      const { data: fallbackExisting, error: fallbackExistingError } = await client
        .from('chat_threads')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (fallbackExistingError) {
        this.logError('getOrCreateChatThread.selectAfterConflict', fallbackExistingError);
      }
      if (fallbackExisting) return fallbackExisting as ChatThread;
    }

    if (error) this.logError('getOrCreateChatThread.insert', error);

    // Fallback for race conditions where another request created the thread first.
    const { data: fallback, error: fallbackError } = await client
      .from('chat_threads')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (fallbackError) {
      this.logError('getOrCreateChatThread.selectFallback', fallbackError);
    }
    if (fallback) return fallback as ChatThread;

    return null;
  }

  async getAllChatThreads(): Promise<ChatThread[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('chat_threads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []) as ChatThread[];
  }

  async getChatThread(threadId: string): Promise<ChatThread | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('chat_threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();
    if (error) {
      this.logError('getChatThread', error);
      return null;
    }
    return (data || null) as ChatThread | null;
  }

  async getChatMessages(threadId: string, limit = 200): Promise<ChatMessage[]> {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) {
      this.logError('getChatMessages', error);
      return [];
    }
    return (data || []) as ChatMessage[];
  }

  async getChatMessagesForThreads(threadIds: string[]): Promise<ChatMessage[]> {
    const client = getClient();
    if (!client || threadIds.length === 0) return [];
    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data || []) as ChatMessage[];
  }

  async sendChatMessage(payload: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('chat_messages')
      .insert(payload)
      .select()
      .single();
    if (error) {
      this.logError('sendChatMessage', error);
      return null;
    }
    return data as ChatMessage;
  }

  async markThreadRead(threadId: string, userId: string): Promise<void> {
    const client = getClient();
    if (!client) return;
    const readAt = new Date().toISOString();
    await client
      .from('chat_messages')
      .update({ read: true, read_at: readAt })
      .eq('thread_id', threadId)
      .eq('sender_type', 'admin')
      .eq('read', false);
  }

  async markThreadReadByAdmin(threadId: string): Promise<void> {
    const client = getClient();
    if (!client) return;
    const readAt = new Date().toISOString();
    await client
      .from('chat_messages')
      .update({ read: true, read_at: readAt })
      .eq('thread_id', threadId)
      .eq('sender_type', 'user')
      .eq('read', false);
  }

  async getUnreadAdminCount(): Promise<number> {
    const client = getClient();
    if (!client) return 0;
    const { count, error } = await client
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'user')
      .eq('read', false);
    if (error) return 0;
    return count || 0;
  }

  async getUnreadUserChatCount(userId: string): Promise<number> {
    const client = getClient();
    if (!client) return 0;
    const { data: thread } = await client
      .from('chat_threads')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!thread?.id) return 0;
    const { count, error } = await client
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', thread.id)
      .eq('sender_type', 'admin')
      .eq('read', false);
    if (error) return 0;
    return count || 0;
  }

  async touchChatLastSeen(userId: string, timestamp = new Date().toISOString()): Promise<void> {
    const client = getClient();
    if (!client) return;
    const { error } = await client
      .from('profiles')
      .update({ chat_last_seen_at: timestamp })
      .eq('id', userId);
    if (error) {
      this.logError('touchChatLastSeen', error);
    }
  }

  async createAccount(payload: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    gender: 'male' | 'female' | 'other';
    date_of_birth: string;
    nationality: string;
    house_address: string;
    occupation: string;
    salary_range: string;
    account_type: 'CHECKING' | 'SAVINGS';
    currency: string;
    avatar_url?: string;
  }): Promise<{ account: Account; card: VirtualCard } | null> {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.rpc('create_account', payload);
    if (error) {
      this.logError('createAccount', error);
      return null;
    }
    return data as { account: Account; card: VirtualCard };
  }

  async deleteUserAsAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Supabase client is not available.' };
    }

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError || !session?.access_token) {
      this.logError('deleteUserAsAdmin.getSession', sessionError);
      return { success: false, error: 'Admin session is not available.' };
    }

    try {
      const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const endpoint = apiBase ? `${apiBase}/api/delete-user` : '/api/delete-user';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          error: payload?.error || 'User deletion failed.',
        };
      }

      return { success: true };
    } catch (error) {
      this.logError('deleteUserAsAdmin.fetch', error);
      return {
        success: false,
        error: 'Unable to reach the user deletion service.',
      };
    }
  }
}

export const supabaseDbService = new SupabaseDbService();
