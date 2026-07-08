import Dexie, { Table } from 'dexie';
import { Injectable } from '@angular/core';

export interface PendingItem {
  id?: number;
  type: 'transaction' | 'transfer';
  status: 'pending' | 'error';
  errorMessage?: string;
  createdAt: string;
  amount: number;
  note?: string;
  date: string;
  // Transaction-specific
  transactionType?: 'income' | 'expense';
  account_id?: number;
  category_id?: number;
  // Transfer-specific
  source_account_id?: number;
  destination_account_id?: number;
}

export interface CachedAccount {
  id: number;
  name: string;
  type: string;
  currency: string;
  balance?: number;
}

export interface CachedCategory {
  id: number;
  name: string;
  logo: string;
  type: string;
  parent_id: number | null;
  user_id: number | null;
}

export interface SuggestionItem {
  id?: number;
  name: string;
  type: 'folder' | 'file';
  parent_id: number | null;   // null = root
  content: string;             // text body (empty for folders)
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineDbService extends Dexie {
  pendingItems!: Table<PendingItem, number>;
  cachedAccounts!: Table<CachedAccount, number>;
  cachedCategories!: Table<CachedCategory, number>;
  suggestionItems!: Table<SuggestionItem, number>;

  constructor() {
    super('WiseBudgetOffline');
    this.version(1).stores({
      pendingItems:     '++id, type, status, createdAt',
      cachedAccounts:   'id',
      cachedCategories: 'id, type, parent_id'
    });
    // Version 2 adds the suggestions file-system table
    this.version(2).stores({
      suggestionItems: '++id, type, parent_id, name'
    });
  }
}
