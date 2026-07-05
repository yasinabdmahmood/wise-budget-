import { Component, computed, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { NetworkService } from '../core/services/network.service';
import { OfflineSyncService } from '../core/services/offline-sync.service';
import { filter } from 'rxjs/operators';

interface NavItem { path: string; label: string; icon: string; }

@Component({
  selector: 'wb-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent {
  readonly navItems: NavItem[] = [
    { path: '/dashboard',    label: 'Home',         icon: '🏠' },
    { path: '/transactions', label: 'Transactions', icon: '↕️' },
    { path: '/accounts',     label: 'Accounts',     icon: '🏦' },
    { path: '/categories',   label: 'Categories',   icon: '🗂️' },
    { path: '/settings',     label: 'Settings',     icon: '⚙️' },
  ];

  pageTitle = signal('Wise Budget');

  private titleMap: Record<string, string> = {
    '/dashboard':    'Wise Budget',
    '/transactions': 'Transactions',
    '/accounts':     'Accounts',
    '/categories':   'Categories',
    '/settings':     'Settings',
    '/pending':      'Pending Sync',
  };

  constructor(
    readonly auth: AuthService,
    readonly network: NetworkService,
    readonly sync: OfflineSyncService,
    private router: Router
  ) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.pageTitle.set(this.titleMap[e.urlAfterRedirects] ?? 'Wise Budget');
      });
    const current = this.router.url.split('?')[0];
    this.pageTitle.set(this.titleMap[current] ?? 'Wise Budget');
  }

  get username() { return this.auth.currentUser()?.username ?? ''; }

  goToPending() { this.router.navigate(['/pending']); }
}
