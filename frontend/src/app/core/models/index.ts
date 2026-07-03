export interface User {
  id: number;
  email: string;
  username: string;
  created_at?: string;
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash';
  currency: string;
  balance: number;
  created_at?: string;
}

export interface Category {
  id: number;
  user_id: number | null;
  name: string;
  logo: string;
  type: 'income' | 'expense';
  parent_id: number | null;
  children?: Category[];
}

export interface Transaction {
  id: number;
  user_id: number;
  account_id: number;
  category_id: number | null;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  date: string;
  created_at?: string;
  // joined
  category_name?: string;
  category_logo?: string;
  account_name?: string;
  currency?: string;
}

export interface Transfer {
  id: number;
  user_id: number;
  source_account_id: number;
  destination_account_id: number;
  amount: number;
  note: string | null;
  date: string;
  created_at?: string;
  // joined
  source_account_name?: string;
  destination_account_name?: string;
  source_currency?: string;
  destination_currency?: string;
}

export interface Summary {
  period: { year: number; month: number; date_from: string; date_to: string };
  totals: { income: number; expense: number; net: number };
  by_expense_category: { category_id: number; category_name: string; category_logo: string; parent_name: string; total: number }[];
  by_income_category:  { category_id: number; category_name: string; category_logo: string; total: number }[];
  daily_flow: { date: string; income: number; expense: number }[];
  account_balances: (Account & { balance: number })[];
  recent_transactions: Transaction[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiList<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}
