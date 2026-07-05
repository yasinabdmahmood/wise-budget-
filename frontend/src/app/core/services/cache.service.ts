import { Injectable } from '@angular/core';
import { OfflineDbService, CachedAccount, CachedCategory } from './offline-db.service';
import { Account, Category } from '../models';

@Injectable({ providedIn: 'root' })
export class CacheService {
  constructor(private db: OfflineDbService) {}

  async saveAccounts(accounts: Account[]): Promise<void> {
    await this.db.cachedAccounts.clear();
    await this.db.cachedAccounts.bulkPut(
      accounts.map(a => ({
        id: a.id, name: a.name, type: a.type,
        currency: a.currency, balance: (a as any).balance ?? 0
      } as CachedAccount))
    );
  }

  async getAccounts(): Promise<CachedAccount[]> {
    return this.db.cachedAccounts.toArray();
  }

  async saveCategories(categories: Category[]): Promise<void> {
    await this.db.cachedCategories.clear();
    await this.db.cachedCategories.bulkPut(
      categories.map(c => ({
        id: c.id, name: c.name, logo: c.logo,
        type: c.type, parent_id: c.parent_id, user_id: c.user_id
      } as CachedCategory))
    );
  }

  async getCategories(type?: 'income' | 'expense'): Promise<CachedCategory[]> {
    const all = await this.db.cachedCategories.toArray();
    return type ? all.filter((c: CachedCategory) => c.type === type) : all;
  }
}
