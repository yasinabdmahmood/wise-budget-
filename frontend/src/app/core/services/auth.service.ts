import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models';

const TOKEN_KEY = 'wb_token';
const USER_KEY  = 'wb_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token  = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user   = signal<User | null>(this.loadUser());

  readonly isLoggedIn = computed(() => !!this._token());
  readonly currentUser = computed(() => this._user());
  readonly token = computed(() => this._token());

  constructor(private http: HttpClient, private router: Router) {}

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  register(email: string, username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, { email, username, password })
      .pipe(tap(res => this.store(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.store(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  /** Call after a successful PUT /auth/me so the header updates immediately */
  patchUser(partial: Partial<User>): void {
    const updated = { ...this._user()!, ...partial };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    this._user.set(updated);
  }

  private store(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._token.set(res.token);
    this._user.set(res.user);
  }
}
