import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { switchMap, catchError } from 'rxjs/operators';
import { throwError, EMPTY } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isBrowser   = isPlatformBrowser(inject(PLATFORM_ID));

  // Attach current access token
  const authedReq = isBrowser ? attachToken(req, authService.getToken()) : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only attempt refresh on 401 in the browser,
      // and never for Auth endpoints (avoids infinite loops)
      if (error.status === 401 && isBrowser && !isAuthUrl(req.url)) {
        return handle401(authedReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

// ── helpers ────────────────────────────────────────────────────────

function attachToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isAuthUrl(url: string): boolean {
  return url.includes('/api/Auth/');
}

function handle401(
  originalReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): ReturnType<HttpInterceptorFn> {
  // No refresh token — go straight to logout
  if (!authService.getRefreshToken()) {
    authService.logout();
    return EMPTY;
  }

  return authService.performRefresh().pipe(
    switchMap(newToken => {
      // Retry the original request with the freshly issued access token
      return next(attachToken(originalReq, newToken));
    }),
    catchError(() => {
      // Refresh itself failed — session is expired, force login
      authService.logout();
      return EMPTY;
    })
  );
}
