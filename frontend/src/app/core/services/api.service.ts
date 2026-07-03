import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account, Category, Transaction, Transfer, Summary, AuthResponse, User } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // ── Auth ──────────────────────────────────────
  getMe(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.base}/auth/me`);
  }
  updateMe(body: { username?: string; currentPassword?: string; newPassword?: string }): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${this.base}/auth/me`, body);
  }

  // ── Accounts ──────────────────────────────────
  getAccounts(): Observable<{ accounts: Account[] }> {
    return this.http.get<{ accounts: Account[] }>(`${this.base}/accounts`);
  }
  getAccount(id: number): Observable<{ account: Account }> {
    return this.http.get<{ account: Account }>(`${this.base}/accounts/${id}`);
  }
  createAccount(body: Partial<Account>): Observable<{ account: Account }> {
    return this.http.post<{ account: Account }>(`${this.base}/accounts`, body);
  }
  updateAccount(id: number, body: Partial<Account>): Observable<{ account: Account }> {
    return this.http.put<{ account: Account }>(`${this.base}/accounts/${id}`, body);
  }
  deleteAccount(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/accounts/${id}`);
  }

  // ── Categories ────────────────────────────────
  getCategories(type?: 'income' | 'expense', flat = false): Observable<{ categories: Category[] }> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (flat) params = params.set('flat', 'true');
    return this.http.get<{ categories: Category[] }>(`${this.base}/categories`, { params });
  }
  createCategory(body: Partial<Category>): Observable<{ category: Category }> {
    return this.http.post<{ category: Category }>(`${this.base}/categories`, body);
  }
  updateCategory(id: number, body: Partial<Category>): Observable<{ category: Category }> {
    return this.http.put<{ category: Category }>(`${this.base}/categories/${id}`, body);
  }
  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/categories/${id}`);
  }

  // ── Transactions ──────────────────────────────
  getTransactions(filters: {
    type?: string; account_id?: number; category_id?: number;
    date_from?: string; date_to?: string; limit?: number; offset?: number;
  } = {}): Observable<{ transactions: Transaction[]; total: number }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params = params.set(k, String(v)); });
    return this.http.get<{ transactions: Transaction[]; total: number }>(`${this.base}/transactions`, { params });
  }
  createTransaction(body: Partial<Transaction>): Observable<{ transaction: Transaction }> {
    return this.http.post<{ transaction: Transaction }>(`${this.base}/transactions`, body);
  }
  updateTransaction(id: number, body: Partial<Transaction>): Observable<{ transaction: Transaction }> {
    return this.http.put<{ transaction: Transaction }>(`${this.base}/transactions/${id}`, body);
  }
  deleteTransaction(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/transactions/${id}`);
  }

  // ── Transfers ─────────────────────────────────
  getTransfers(filters: { account_id?: number; date_from?: string; date_to?: string } = {}): Observable<{ transfers: Transfer[]; total: number }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params = params.set(k, String(v)); });
    return this.http.get<{ transfers: Transfer[]; total: number }>(`${this.base}/transfers`, { params });
  }
  createTransfer(body: Partial<Transfer>): Observable<{ transfer: Transfer }> {
    return this.http.post<{ transfer: Transfer }>(`${this.base}/transfers`, body);
  }
  updateTransfer(id: number, body: Partial<Transfer>): Observable<{ transfer: Transfer }> {
    return this.http.put<{ transfer: Transfer }>(`${this.base}/transfers/${id}`, body);
  }
  deleteTransfer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/transfers/${id}`);
  }

  // ── Summary ───────────────────────────────────
  getSummary(month?: number, year?: number): Observable<Summary> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    if (year)  params = params.set('year',  year);
    return this.http.get<Summary>(`${this.base}/summary`, { params });
  }
}
