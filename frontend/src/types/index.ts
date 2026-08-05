export type AccountType = 'checking' | 'savings' | 'wallet' | 'credit' | 'investment';
export type TransactionType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  balance?: number;
  _count?: { transactions: number };
}

export interface AccountInput {
  name: string;
  type: AccountType;
  initialBalance: number;
  color?: string;
  icon?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number; budgets: number };
}

export interface CategoryInput {
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  notes: string | null;
  accountId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  account?: Pick<Account, 'id' | 'name' | 'icon'>;
  category?: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'type'>;
}

export interface TransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  accountId: string;
  categoryId: string;
  notes?: string;
}

export interface TransactionQuery {
  year?: number;
  month?: number;
  search?: string;
  type?: TransactionType | '';
  categoryId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
  category?: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'type'>;
}

export interface BudgetInput {
  categoryId: string;
  amount: number;
  month: number;
  year: number;
}

export interface BudgetRatio extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
}

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string>;
}