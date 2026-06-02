import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly mobileSidebarOpen = signal(false);

  openSidebar(): void  { this.mobileSidebarOpen.set(true); }
  closeSidebar(): void { this.mobileSidebarOpen.set(false); }
  toggleSidebar(): void { this.mobileSidebarOpen.update(v => !v); }
}
