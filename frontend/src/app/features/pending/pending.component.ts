import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { CacheService } from '../../core/services/cache.service';
import { NetworkService } from '../../core/services/network.service';
import { PendingItem, CachedAccount, CachedCategory } from '../../core/services/offline-db.service';

@Component({
  selector: 'wb-pending',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pending.component.html',
  styleUrl: './pending.component.css'
})
export class PendingComponent implements OnInit {
  // ── Edit sheet state ──────────────────────────
  editTarget  = signal<PendingItem | null>(null);
  saving      = signal(false);
  error       = signal('');

  // ── Cached lookups for display ────────────────
  accounts   = signal<CachedAccount[]>([]);
  categories = signal<CachedCategory[]>([]);

  // IDs currently awaiting API call
  approving = signal<Set<number>>(new Set());

  editForm!: FormGroup;

  // ── Computed helpers ──────────────────────────
  filteredCats = computed(() =>
    this.categories().filter(c => c.type === this.editTarget()?.transactionType)
  );

  constructor(
    readonly sync: OfflineSyncService,
    private cache: CacheService,
    readonly network: NetworkService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadLookups();
  }

  buildForm() {
    this.editForm = this.fb.group({
      // shared
      amount: [null, [Validators.required, Validators.min(0.01)]],
      date:   ['', Validators.required],
      note:   [''],
      // transaction-only
      account_id:  [null],
      category_id: [null],
      // transfer-only
      source_account_id:      [null],
      destination_account_id: [null],
    });
  }

  private async loadLookups() {
    const [accs, cats] = await Promise.all([
      this.cache.getAccounts(),
      this.cache.getCategories()
    ]);
    this.accounts.set(accs);
    this.categories.set(cats);
  }

  // ── Name resolution helpers ───────────────────
  accountName(id?: number): string {
    if (!id) return '—';
    return this.accounts().find(a => a.id === id)?.name ?? `#${id}`;
  }

  categoryName(id?: number): string {
    if (!id) return '—';
    const c = this.categories().find(c => c.id === id);
    return c ? `${c.logo} ${c.name}` : `#${id}`;
  }

  // ── Edit sheet ────────────────────────────────
  openEdit(item: PendingItem) {
    this.editTarget.set(item);
    this.error.set('');

    if (item.type === 'transaction') {
      this.editForm.patchValue({
        amount:      item.amount,
        date:        item.date,
        note:        item.note ?? '',
        account_id:  item.account_id ?? null,
        category_id: item.category_id ?? null,
        source_account_id:      null,
        destination_account_id: null
      });
    } else {
      this.editForm.patchValue({
        amount: item.amount,
        date:   item.date,
        note:   item.note ?? '',
        source_account_id:      item.source_account_id ?? null,
        destination_account_id: item.destination_account_id ?? null,
        account_id:  null,
        category_id: null
      });
    }
  }

  closeEdit() { this.editTarget.set(null); }

  async saveEdit() {
    if (this.editForm.invalid || this.saving()) return;
    const item = this.editTarget();
    if (!item?.id) return;

    this.saving.set(true);
    const v = this.editForm.value;

    const changes: Partial<PendingItem> = {
      amount: Number(v.amount),
      date:   v.date,
      note:   v.note || undefined
    };

    if (item.type === 'transaction') {
      changes.account_id  = v.account_id;
      changes.category_id = v.category_id;
    } else {
      changes.source_account_id      = v.source_account_id;
      changes.destination_account_id = v.destination_account_id;
    }

    await this.sync.updateItem(item.id, changes);
    this.saving.set(false);
    this.closeEdit();
  }

  // ── Approve ───────────────────────────────────
  async approve(item: PendingItem) {
    if (!item.id) return;
    const next = new Set(this.approving());
    next.add(item.id);
    this.approving.set(next);

    await this.sync.approve(item);

    const after = new Set(this.approving());
    after.delete(item.id);
    this.approving.set(after);
  }

  isApproving(item: PendingItem) {
    return this.approving().has(item.id!);
  }

  // ── Reject ────────────────────────────────────
  async reject(item: PendingItem) {
    if (!confirm('Remove this queued item? It will not be synced.')) return;
    await this.sync.reject(item.id!);
  }

  // ── Approve all ───────────────────────────────
  async approveAll() {
    if (!this.network.isOnline()) return;
    const items = [...this.sync.pendingItems()];
    for (const item of items) {
      await this.approve(item);
    }
  }

  // ── Format helpers ────────────────────────────
  fmt(n: number) {
    return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n);
  }

  fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  fmtCreated(iso: string) {
    return new Date(iso).toLocaleString('en', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  otherAccounts(excludeId: number | null) {
    return this.accounts().filter(a => a.id !== excludeId);
  }
}
