import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NetworkService } from '../../core/services/network.service';
import { CacheService } from '../../core/services/cache.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { Account, Transfer } from '../../core/models';

type Sheet = 'account' | 'transfer' | null;

@Component({
  selector: 'wb-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.css'
})
export class AccountsComponent implements OnInit {
  accounts  = signal<Account[]>([]);
  transfers = signal<Transfer[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  error     = signal('');
  sheet     = signal<Sheet>(null);
  editTarget = signal<Account | null>(null);

  accountForm!: FormGroup;
  transferForm!: FormGroup;

  readonly TYPES     = ['cash', 'checking', 'savings', 'credit'] as const;
  readonly CURRENCIES = ['IQD', 'USD', 'EUR', 'GBP', 'TRY', 'SAR', 'AED'];
  readonly TYPE_ICONS: Record<string, string> = {
    cash: '💵', checking: '🏧', savings: '🏦', credit: '💳'
  };

  totalBalance = signal(0);

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    readonly network: NetworkService,
    private cache: CacheService,
    private offlineSync: OfflineSyncService
  ) {}

  ngOnInit() {
    this.buildForms();
    this.load();
  }

  buildForms() {
    this.accountForm = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(2)]],
      type:     ['cash', Validators.required],
      currency: ['IQD', Validators.required]
    });
    this.transferForm = this.fb.group({
      source_account_id:      [null, Validators.required],
      destination_account_id: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      note:   [''],
      date:   [new Date().toISOString().slice(0, 10), Validators.required]
    });
  }

  load() {
    if (!this.network.isOnline()) {
      this.loadFromCache();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.getAccounts().subscribe({
      next: r => {
        this.accounts.set(r.accounts);
        this.totalBalance.set(r.accounts.reduce((s, a) => s + a.balance, 0));
        this.cache.saveAccounts(r.accounts);   // keep cache fresh
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load accounts'); this.loading.set(false); }
    });
    this.api.getTransfers({ }).subscribe({
      next: r => this.transfers.set(r.transfers.slice(0, 10))
    });
  }

  private async loadFromCache() {
    const accs = await this.cache.getAccounts();
    this.accounts.set(accs as any[]);
    this.totalBalance.set(accs.reduce((s, a) => s + (a.balance ?? 0), 0));
    this.error.set('Offline — showing last cached balances. Transfers unavailable.');
    this.loading.set(false);
  }

  // ── Account sheet ─────────────────────────────
  openAdd() {
    this.editTarget.set(null);
    this.accountForm.reset({ type: 'cash', currency: 'IQD', name: '' });
    this.sheet.set('account');
  }

  openEdit(a: Account) {
    this.editTarget.set(a);
    this.accountForm.patchValue({ name: a.name, type: a.type, currency: a.currency });
    this.sheet.set('account');
  }

  saveAccount() {
    if (this.accountForm.invalid || this.saving()) return;
    this.saving.set(true);
    const val = this.accountForm.value;
    const req = this.editTarget()
      ? this.api.updateAccount(this.editTarget()!.id, val)
      : this.api.createAccount(val);
    req.subscribe({
      next: () => { this.sheet.set(null); this.load(); this.saving.set(false); },
      error: (e) => { this.error.set(e.error?.error || 'Save failed'); this.saving.set(false); }
    });
  }

  deleteAccount(a: Account) {
    if (!confirm(`Delete "${a.name}"? All its transactions will also be deleted.`)) return;
    this.api.deleteAccount(a.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Delete failed')
    });
  }

  // ── Transfer sheet ────────────────────────────
  openTransfer() {
    this.transferForm.reset({ date: new Date().toISOString().slice(0, 10), note: '' });
    this.sheet.set('transfer');
  }

  async saveTransfer() {
    if (this.transferForm.invalid || this.saving()) return;
    this.saving.set(true);
    const val = { ...this.transferForm.value, amount: Number(this.transferForm.value.amount) };

    // ── Offline: queue it ─────────────────────────────
    if (!this.network.isOnline()) {
      await this.offlineSync.enqueue({
        type:                   'transfer',
        source_account_id:      val.source_account_id,
        destination_account_id: val.destination_account_id,
        amount:                 val.amount,
        note:                   val.note || undefined,
        date:                   val.date
      });
      this.sheet.set(null);
      this.saving.set(false);
      return;
    }

    // ── Online: normal API call ───────────────────────
    this.api.createTransfer(val).subscribe({
      next: () => { this.sheet.set(null); this.load(); this.saving.set(false); },
      error: (e) => { this.error.set(e.error?.error || 'Transfer failed'); this.saving.set(false); }
    });
  }

  deleteTransfer(t: Transfer) {
    if (!confirm('Delete this transfer?')) return;
    this.api.deleteTransfer(t.id).subscribe({ next: () => this.load() });
  }

  closeSheet() { this.sheet.set(null); }

  fmt(n: number) { return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n); }
  fmtDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }); }

  otherAccounts(excludeId: number | null) {
    return this.accounts().filter(a => a.id !== excludeId);
  }
}
