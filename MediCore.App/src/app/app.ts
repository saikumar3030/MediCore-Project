import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationError, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.isBrowser) return;

    this.router.events.subscribe(event => {
      if (!(event instanceof NavigationError)) return;
      if (this.isChunkLoadError(event.error)) {
        const target = (event.url && event.url !== '/') ? event.url : window.location.pathname;
        window.location.replace(target);
      }
    });
  }

  private isChunkLoadError(err: unknown): boolean {
    const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
    return msg.includes('failed to fetch dynamically imported module')
        || msg.includes('error loading dynamically imported module')
        || msg.includes('importing a module script failed')
        || msg.includes('chunkloaderror');
  }
}
