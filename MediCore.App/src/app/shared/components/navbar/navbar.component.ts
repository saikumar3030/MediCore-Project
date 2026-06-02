import { Component, inject, computed, signal, ElementRef, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { NAV_ITEMS } from '../nav-config';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef<HTMLElement>);
  ui = inject(UiStateService);

  currentUser = this.authService.currentUser;

  visibleNavItems = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    return NAV_ITEMS.filter(item => item.roles.includes(user.role));
  });

  userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return 'AD';
    const parts = user.userName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return user.userName.substring(0, 2).toUpperCase();
  });

  showUserMenu = signal(false);

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showUserMenu()) return;
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeUserMenu();
    }
  }
}
