import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  // During SSR there is no localStorage — always allow and let the
  // client-side re-run the guard after hydration.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;

  const authService    = inject(AuthService);
  const router         = inject(Router);
  const requiredRoles  = route.data['roles'] as UserRole[];

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (requiredRoles?.length > 0 && !authService.hasAnyRole(requiredRoles)) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
