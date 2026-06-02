import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { NAV_ITEMS } from '../nav-config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  private authService = inject(AuthService);
  ui = inject(UiStateService);

  currentUser = this.authService.currentUser;

  visibleNavItems = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    return NAV_ITEMS.filter(item => item.roles.includes(user.role));
  });

  mainItems      = computed(() => this.visibleNavItems().filter(i => i.section === 'main'));
  oversightItems = computed(() => this.visibleNavItems().filter(i => i.section === 'oversight'));

  userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return 'AD';
    const parts = user.userName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return user.userName.substring(0, 2).toUpperCase();
  });

  logout(): void {
    this.ui.closeSidebar();
    this.authService.logout();
  }
}
