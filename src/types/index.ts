export type Role = 'user' | 'admin' | 'guest';

export type UserStatus = 'UNREGISTERED' | 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  role: Role;
  status?: UserStatus;
  nationality?: string;
  primaryAccountType?: 'CHECKING' | 'SAVINGS' | 'MONEY_MARKET';
  additionalAccountTypes?: ('CHECKING' | 'SAVINGS' | 'MONEY_MARKET')[];
  currency?: string;
  avatar?: string;
  cifId?: string;
  accountNumber?: string;
  routingNumber?: string;
  balance?: number;
  preferences?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Account {
  id: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'debit' | 'credit';
  description?: string;
  date: string;
}

export interface AuthState {
  token?: string | null;
  user?: UserProfile | null;
  isAuthenticated: boolean;
}
