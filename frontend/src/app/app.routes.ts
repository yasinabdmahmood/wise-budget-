import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Guest-only routes
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },

  // Protected routes (inside shell)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: 'dashboard',    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'transactions', loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent) },
      { path: 'accounts',     loadComponent: () => import('./features/accounts/accounts.component').then(m => m.AccountsComponent) },
      { path: 'categories',   loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent) },
      { path: 'settings',     loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];
