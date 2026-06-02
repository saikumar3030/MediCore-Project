import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public pages — safe to prerender (no auth needed)
  { path: 'login',    renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },

  // All protected routes must render on the client where localStorage is available.
  // Prerendering protected routes on the server causes logout-on-refresh because
  // the server has no localStorage and the auth guard sees isLoggedIn()=false.
  { path: '**', renderMode: RenderMode.Client }
];
