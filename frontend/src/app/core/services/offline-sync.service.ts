import { Injectable, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OfflineDbService, PendingItem } from './offline-db.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private _items = signal<PendingItem[]>([]);

  readonly pendingItems  = this._items.asReadonly();
  readonly pendingCount  = computed(() => this._items().length);
  readonly hasPending    = computed(() => this._items().length > 0);

  constructor(private db: OfflineDbService, private api: ApiService) {
    this.refresh();
  }

  /** Reload queue from IndexedDB into signal */
  async refresh(): Promise<void> {
    const items = await this.db.pendingItems.orderBy('createdAt').toArray();
    this._items.set(items);
  }

  /** Add a new item to the offline queue */
  async enqueue(item: Omit<PendingItem, 'id' | 'status' | 'createdAt'>): Promise<void> {
    await this.db.pendingItems.add({
      ...item,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await this.refresh();
  }

  /** Update a queued item (for editing before approval) */
  async updateItem(id: number, changes: Partial<PendingItem>): Promise<void> {
    await this.db.pendingItems.update(id, { ...changes, status: 'pending', errorMessage: undefined });
    await this.refresh();
  }

  /** Reject — permanently remove from queue */
  async reject(id: number): Promise<void> {
    await this.db.pendingItems.delete(id);
    await this.refresh();
  }

  /** Approve — submit to API, remove on success, mark error on failure */
  async approve(item: PendingItem): Promise<void> {
    try {
      if (item.type === 'transaction') {
        await firstValueFrom(this.api.createTransaction({
          account_id:  item.account_id,
          category_id: item.category_id,
          type:        item.transactionType as any,
          amount:      item.amount,
          note:        item.note,
          date:        item.date
        }));
      } else {
        await firstValueFrom(this.api.createTransfer({
          source_account_id:      item.source_account_id,
          destination_account_id: item.destination_account_id,
          amount: item.amount,
          note:   item.note,
          date:   item.date
        }));
      }
      await this.reject(item.id!);   // success → remove
    } catch (e: any) {
      await this.db.pendingItems.update(item.id!, {
        status: 'error',
        errorMessage: e.error?.error || 'Sync failed — check your connection'
      });
      await this.refresh();
    }
  }
}
