// Extended banking types with full account lifecycle support
export type UserStatus = 
  | 'UNREGISTERED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'RESTRICTED';

export type Role = 'user' | 'admin' | 'guest';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: Role;
  status: UserStatus;
  nationality?: string;
  primaryAccountType?: 'CHECKING' | 'SAVINGS' | 'MONEY_MARKET';
  additionalAccountTypes?: ('CHECKING' | 'SAVINGS' | 'MONEY_MARKET')[];
  currency?: string;
  avatar?: string;
  cifId?: string; // Customer ID
  accountNumber?: string;
  routingNumber?: string;
  balance?: number;
  // New account creation fields
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  houseAddress?: string;
  occupation?: string;
  salaryRange?: string;
  pin?: string; // Store hashed PIN in production
  photoUrl?: string; // URL to uploaded photo used as avatar
  preferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CIF {
  id: string; // CIF-2026-XXXXXX
  userId: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  cifId: string;
  userId: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'CHECKING' | 'SAVINGS';
  status: 'ACTIVE' | 'CLOSED' | 'SUSPENDED';
  createdAt: string;
  currency?: string;
}

export interface Ledger {
  id: string;
  accountId: string;
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface VirtualCard {
  id: string;
  accountId: string;
  cardNumber: string; // masked or full
  expiryDate: string;
  cvv: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  issuedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  timestamp: string;
  currency?: string;
}

export interface AdminActionLog {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface Account {
  id: string;
  balance: number;
  currency: string;
}
