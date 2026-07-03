import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Summary } from '../../core/models';

@Component({
  selector: 'wb-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  summary  = signal<Summary | null>(null);
  loading  = signal(true);
  error    = signal('');

  now      = new Date();
  year     = signal(this.now.getFullYear());
  month    = signal(this.now.getMonth() + 1);

  readonly MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  monthLabel = computed(() => `${this.MONTHS[this.month() - 1]} ${this.year()}`);

  get username() { return this.auth.currentUser()?.username ?? 'there'; }

  // Expense bar widths relative to the biggest category
  expenseBars = computed(() => {
    const cats = this.summary()?.by_expense_category ?? [];
    const max  = cats[0]?.total ?? 1;
    return cats.slice(0, 5).map(c => ({
      ...c,
      pct: Math.round((c.total / max) * 100)
    }));
  });

  totalBalance = computed(() =>
    (this.summary()?.account_balances ?? []).reduce((s, a) => s + a.balance, 0)
  );

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.getSummary(this.month(), this.year()).subscribe({
      next:  s  => { this.summary.set(s); this.loading.set(false); },
      error: () => { this.error.set('Failed to load summary'); this.loading.set(false); }
    });
  }

  prevMonth() {
    if (this.month() === 1) { this.month.set(12); this.year.update(y => y - 1); }
    else this.month.update(m => m - 1);
    this.load();
  }

  nextMonth() {
    if (this.month() === 12) { this.month.set(1); this.year.update(y => y + 1); }
    else this.month.update(m => m + 1);
    this.load();
  }

  isCurrentMonth() {
    const now = new Date();
    return this.year() === now.getFullYear() && this.month() === now.getMonth() + 1;
  }

  fmt(n: number) {
    return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n);
  }

  fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }
}
