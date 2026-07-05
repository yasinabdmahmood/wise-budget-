import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NetworkService } from '../../core/services/network.service';
import { CacheService } from '../../core/services/cache.service';
import { Transaction, Account, Category } from '../../core/models';

@Component({
  selector: 'wb-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.css'
})
export class TransactionsComponent implements OnInit {
  // ── Data ──────────────────────────────────────
  transactions = signal<Transaction[]>([]);
  accounts     = signal<Account[]>([]);
  categories   = signal<Category[]>([]);
  total        = signal(0);
  loading      = signal(true);
  saving       = signal(false);
  error        = signal('');

  // ── Filters ───────────────────────────────────
  filterType   = signal<'all' | 'income' | 'expense'>('all');
  offset       = signal(0);
  readonly LIMIT = 30;

  // ── Sheet state ───────────────────────────────
  showSheet    = signal(false);
  editTarget   = signal<Transaction | null>(null);
  sheetType    = signal<'income' | 'expense'>('expense');

  form!: FormGroup;

  // Filtered categories based on selected type in form
  filteredCats = computed(() =>
    this.categories().filter(c => c.type === this.sheetType())
  );

  hasMore = computed(() => this.offset() + this.LIMIT < this.total());

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    readonly network: NetworkService,
    private cache: CacheService
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadData();
  }

  buildForm() {
    const today = new Date().toISOString().slice(0, 10);
    this.form = this.fb.group({
      account_id:  [null, Validators.required],
      category_id: [null],
      amount:      [null, [Validators.required, Validators.min(0.01)]],
      note:        [''],
      date:        [today, Validators.required]
    });
  }

  loadData() {
    this.loadDropdowns();

    if (!this.network.isOnline()) {
      this.error.set('You are offline — showing cached data is not available. Add transactions to the queue using the + buttons.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const type = this.filterType() === 'all' ? undefined : this.filterType();
    this.api.getTransactions({ type, limit: this.LIMIT, offset: this.offset() }).subscribe({
      next: r => {
        if (this.offset() === 0) this.transactions.set(r.transactions);
        else this.transactions.update(t => [...t, ...r.transactions]);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load transactions'); this.loading.set(false); }
    });
  }

  /** Load accounts + categories: from API when online (and save to cache), from cache when offline */
  private async loadDropdowns() {
    if (this.network.isOnline()) {
      this.api.getAccounts().subscribe(r => {
        this.accounts.set(r.accounts);
        this.cache.saveAccounts(r.accounts);
      });
      this.api.getCategories(undefined, true).subscribe(r => {
        this.categories.set(r.categories);
        this.cache.saveCategories(r.categories);
      });
    } else {
      const [accs, cats] = await Promise.all([
        this.cache.getAccounts(),
        this.cache.getCategories()
      ]);
      this.accounts.set(accs as any[]);
      this.categories.set(cats as any[]);
    }
  }

  setFilter(type: 'all' | 'income' | 'expense') {
    this.filterType.set(type);
    this.offset.set(0);
    this.loadData();
  }

  loadMore() {
    this.offset.update(o => o + this.LIMIT);
    this.loadData();
  }

  // ── Sheet ─────────────────────────────────────
  openAdd(type: 'income' | 'expense') {
    this.editTarget.set(null);
    this.sheetType.set(type);
    const today = new Date().toISOString().slice(0, 10);
    this.form.reset({ date: today, account_id: null, category_id: null, amount: null, note: '' });
    this.showSheet.set(true);
  }

  openEdit(t: Transaction) {
    this.editTarget.set(t);
    this.sheetType.set(t.type);
    this.form.patchValue({
      account_id:  t.account_id,
      category_id: t.category_id,
      amount:      t.amount,
      note:        t.note ?? '',
      date:        t.date
    });
    this.showSheet.set(true);
  }

  closeSheet() { this.showSheet.set(false); }

  submit() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const val = { ...this.form.value, type: this.sheetType(), amount: Number(this.form.value.amount) };

    const req = this.editTarget()
      ? this.api.updateTransaction(this.editTarget()!.id, val)
      : this.api.createTransaction(val);

    req.subscribe({
      next: () => { this.closeSheet(); this.offset.set(0); this.loadData(); this.saving.set(false); },
      error: (err) => { this.error.set(err.error?.error || 'Save failed'); this.saving.set(false); }
    });
  }

  delete(t: Transaction) {
    if (!confirm(`Delete this ${t.type}?`)) return;
    this.api.deleteTransaction(t.id).subscribe({
      next: () => { this.offset.set(0); this.loadData(); },
      error: () => this.error.set('Delete failed')
    });
  }

  fmt(n: number) { return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n); }
  fmtDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }); }

  // Group transactions by date for display
  groupedDates = computed(() => {
    const groups: { date: string; label: string; items: Transaction[] }[] = [];
    const map = new Map<string, Transaction[]>();
    for (const t of this.transactions()) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    map.forEach((items, date) => {
      groups.push({ date, label: this.fmtDate(date), items });
    });
    return groups;
  });
}
