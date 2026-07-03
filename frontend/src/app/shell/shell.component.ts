import { Component, computed, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { filter } from 'rxjs/operators';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  activeIcon: string;
}

@Component({
  selector: 'wb-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent {
  readonly navItems: NavItem[] = [
    { path: '/dashboard',    label: 'Home',         icon: '🏠', activeIcon: '🏠' },
    { path: '/transactions', label: 'Transactions', icon: '↕️', activeIcon: '↕️' },
    { path: '/accounts',     label: 'Accounts',     icon: '🏦', activeIcon: '🏦' },
    { path: '/categories',   label: 'Categories',   icon: '🗂️', activeIcon: '🗂️' },
    { path: '/settings',     label: 'Settings',     icon: '⚙️', activeIcon: '⚙️' },
  ];

  pageTitle = signal('Wise Budget');

  private titleMap: Record<string, string> = {
    '/dashboard':    'Wise Budget',
    '/transactions': 'Transactions',
    '/accounts':     'Accounts',
    '/categories':   'Categories',
    '/settings':     'Settings',
  };

  constructor(
    readonly auth: AuthService,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.pageTitle.set(this.titleMap[e.urlAfterRedirects] ?? 'Wise Budget');
    });
    // Set initial title
    const current = this.router.url.split('?')[0];
    this.pageTitle.set(this.titleMap[current] ?? 'Wise Budget');
  }

  get username() { return this.auth.currentUser()?.username ?? ''; }
}
