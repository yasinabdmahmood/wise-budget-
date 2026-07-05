import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  private _isOnline = signal(navigator.onLine);
  readonly isOnline = this._isOnline.asReadonly();

  constructor(private http: HttpClient) {
    // Browser events — instant but not always reliable
    window.addEventListener('online',  () => this.ping());
    window.addEventListener('offline', () => this._isOnline.set(false));

    // Periodic ping every 30 seconds as a safety net
    setInterval(() => this.ping(), 30_000);
  }

  /** Hits /api/health to confirm real connectivity (not just router connectivity) */
  ping(): void {
    this.http.get(`${environment.apiUrl}/health`, { observe: 'response' })
      .subscribe({
        next:  () => this._isOnline.set(true),
        error: () => this._isOnline.set(false)
      });
  }
}
