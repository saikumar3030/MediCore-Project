import { Injectable, signal, PLATFORM_ID, inject, afterNextRender } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map, catchError, filter, take } from 'rxjs/operators';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, User, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl    = `${environment.apiGatewayUrl}/api`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  currentUser = signal<User | null>(this.getUserFromStorage());
  isLoggedIn  = signal<boolean>(!!this.getToken());

  // ── Refresh token state ─────────────────────────────────────────
  private _isRefreshing  = false;
  private _refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    // After the first client-side render completes, re-sync signals
    // from localStorage in case SSR initialised them with null values.
    afterNextRender(() => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token) {
        this.isLoggedIn.set(true);
        if (userStr) {
          try { this.currentUser.set(JSON.parse(userStr)); } catch { /* ignore */ }
        }
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────────

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/User/register`, request);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/Auth/login`, request).pipe(
      tap(res => this.saveSession(res))
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  getRefreshToken(): string | null {
    return this.isBrowser ? localStorage.getItem('refreshToken') : null;
  }

  // ── Refresh logic (called by the interceptor) ───────────────────

  performRefresh(): Observable<string> {
    if (this._isRefreshing) {
      // Another request already triggered a refresh — wait for it
      return this._refreshSubject.pipe(
        filter(t => t !== null),
        take(1),
        map(t => t!)
      );
    }

    const storedRefreshToken = this.getRefreshToken();
    if (!storedRefreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    this._isRefreshing = true;
    this._refreshSubject.next(null);

    return this.http
      .post<LoginResponse>(`${this.apiUrl}/Auth/refresh-token`, { refreshToken: storedRefreshToken })
      .pipe(
        tap(res => {
          this.setItem('token', res.accessToken);
          if (res.refreshToken) this.setItem('refreshToken', res.refreshToken);
          this._refreshSubject.next(res.accessToken);
          this._isRefreshing = false;
        }),
        map(res => res.accessToken),
        catchError(err => {
          this._isRefreshing = false;
          this._refreshSubject.next(null);
          this.clearSession();
          return throwError(() => err);
        })
      );
  }

  // ── Roles ───────────────────────────────────────────────────────

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.currentUser()?.role;
    return userRole ? roles.includes(userRole) : false;
  }

  // ── Private helpers ─────────────────────────────────────────────

  private saveSession(res: LoginResponse): void {
    this.setItem('token', res.accessToken);
    this.setItem('refreshToken', res.refreshToken);
    const user: User = {
      userId:   res.userId,
      userName: res.userName,
      email:    res.email,
      role:     res.role,
      status:   'Active' as any
    };
    this.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
    this.isLoggedIn.set(true);
  }

  private clearSession(): void {
    this.removeItem('token');
    this.removeItem('refreshToken');
    this.removeItem('user');
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }

  private getUserFromStorage(): User | null {
    if (!this.isBrowser) return null;
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  private setItem(key: string, value: string): void {
    if (this.isBrowser) localStorage.setItem(key, value);
  }

  private removeItem(key: string): void {
    if (this.isBrowser) localStorage.removeItem(key);
  }
}
