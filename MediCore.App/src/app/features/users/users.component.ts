import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User, UserRole, RegisterRequest } from '../../core/models/user.model';

type Panel = 'none' | 'create' | 'edit' | 'delete';

interface RoleMeta {
  label: string;
  color: string;   // text color class
  bg: string;      // bg class
  ring: string;    // ring class
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private fb          = inject(FormBuilder);

  // ── Data ───────────────────────────────────────────────────────
  users       = signal<User[]>([]);
  loading     = signal(true);
  formLoading = signal(false);

  // ── UI state ───────────────────────────────────────────────────
  panel        = signal<Panel>('none');
  selectedUser = signal<User | null>(null);
  toast        = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ── Filters ────────────────────────────────────────────────────
  search     = signal('');
  roleFilter = signal<UserRole | ''>('');

  // ── Static data ────────────────────────────────────────────────
  // This page manages staff only. Patients are managed from the Patients page.
  /** Roles admin can assign here (no Admin, no Patient — patients are created on the Patients page). */
  readonly creatableRoles = Object.values(UserRole).filter(r => r !== UserRole.Admin && r !== UserRole.Patient);
  /** Role chips + filter dropdown options. Excludes Patient to match the page scope. */
  readonly allRoles        = ['', ...Object.values(UserRole).filter(r => r !== UserRole.Patient)];
  // Backend GenderOption: Male=1, Female=2, Other=3
  readonly genderOptions   = [
    { value: 1, label: 'Male' },
    { value: 2, label: 'Female' },
    { value: 3, label: 'Other' }
  ];

  readonly roleMeta: Record<string, RoleMeta> = {
    [UserRole.Admin]:          { label: 'Admin',           color: 'text-red-400',    bg: 'bg-red-500/15',     ring: 'ring-red-500/30' },
    [UserRole.Doctor]:         { label: 'Doctor',          color: 'text-blue-400',   bg: 'bg-blue-500/15',    ring: 'ring-blue-500/30' },
    [UserRole.Patient]:        { label: 'Patient',         color: 'text-cyan-400',   bg: 'bg-cyan-500/15',    ring: 'ring-cyan-500/30' },
    [UserRole.Pharmacist]:     { label: 'Pharmacist',      color: 'text-purple-400', bg: 'bg-purple-500/15',  ring: 'ring-purple-500/30' },
    [UserRole.Lab_Technician]: { label: 'Lab Technician',  color: 'text-yellow-400', bg: 'bg-yellow-500/15',  ring: 'ring-yellow-500/30' },
    [UserRole.Finance_Officer]:{ label: 'Finance Officer', color: 'text-orange-400', bg: 'bg-orange-500/15',  ring: 'ring-orange-500/30' },
  };

  // ── Computed ───────────────────────────────────────────────────
  filteredUsers = computed(() => {
    let list = this.users();
    const q    = this.search().trim().toLowerCase();
    const role = this.roleFilter();
    if (q)    list = list.filter(u => u.userName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    if (role) list = list.filter(u => u.role === role);
    return list;
  });

  roleStats = computed(() => {
    const counts: Record<string, number> = {};
    this.users().forEach(u => counts[u.role] = (counts[u.role] ?? 0) + 1);
    return counts;
  });

  // ── Forms ──────────────────────────────────────────────────────
  createForm = this.fb.group({
    userName:    ['', [Validators.required, Validators.minLength(3)]],
    email:       ['', [Validators.required, Validators.email]],
    password:    ['', [Validators.required, Validators.minLength(6)]],
    role:        [UserRole.Doctor, Validators.required],
    // patient fields (kept for shape parity; never used here since Patient is excluded)
    dob:        [''],
    gender:     [1],
    phone:      [''],
    address:    [''],
    insuranceID:['']
  });

  editForm = this.fb.group({
    userName: ['', [Validators.required, Validators.minLength(3)]],
    email:    ['', [Validators.required, Validators.email]],
    role:     [UserRole.Doctor, Validators.required],
    status:   ['Active' as 'Active' | 'Inactive', Validators.required]
  });

  get createRole(): UserRole { return this.createForm.get('role')?.value as UserRole; }
  get isPatientRole(): boolean { return this.createRole === UserRole.Patient; }

  // ── Lifecycle ──────────────────────────────────────────────────
  ngOnInit(): void { this.loadUsers(); }

  // ── Data methods ───────────────────────────────────────────────
  loadUsers(): void {
    this.loading.set(true);
    this.userService.getAll().subscribe({
      next:  u  => {
        // Patients are managed on the Patients page — exclude them from this staff list
        // so role stats, totals, and the list itself all reflect staff only.
        this.users.set(u.filter(x => x.role !== UserRole.Patient));
        this.loading.set(false);
      },
      error: () => { this.showToast('Failed to load users.', 'error'); this.loading.set(false); }
    });
  }

  // ── Create ─────────────────────────────────────────────────────
  openCreate(): void {
    this.createForm.reset({ role: UserRole.Doctor, gender: 1 });
    this.panel.set('create');
  }

  submitCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    if (this.isPatientRole && !this.createForm.get('dob')?.value) {
      this.createForm.get('dob')?.setErrors({ required: true });
      this.createForm.get('dob')?.markAsTouched();
      return;
    }

    this.formLoading.set(true);
    const v = this.createForm.value;
    const payload: RegisterRequest = {
      userName: v.userName!,
      email:    v.email!,
      password: v.password!,
      role:     v.role!,
      status:   'Active',
      ...(this.isPatientRole && {
        patientRequestDtos: {
          dob:         v.dob!,
          gender:      Number(v.gender),
          phone:       v.phone || undefined,
          address:     v.address || undefined,
          insuranceID: v.insuranceID || undefined
        }
      })
    };

    this.userService.register(payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.panel.set('none');
        this.showToast(`User "${payload.userName}" created successfully.`, 'success');
        this.loadUsers();
      },
      error: err => {
        this.formLoading.set(false);
        this.showToast(err?.error?.message || err?.error || 'Failed to create user.', 'error');
      }
    });
  }

  // ── Edit ───────────────────────────────────────────────────────
  openEdit(user: User): void {
    this.selectedUser.set(user);
    // Seed status from the row so the dropdown reflects current state. Admins
    // typically use this to flip a soft-deleted (Inactive) user back to Active.
    this.editForm.reset({
      userName: user.userName,
      email: user.email,
      role: user.role,
      status: (user.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive'
    });
    this.panel.set('edit');
  }

  // Admin rows are role-locked: backend rejects changing an Admin's role and
  // disallows assigning the Admin role, so the dropdown is disabled for them.
  isEditingAdmin(): boolean {
    return this.selectedUser()?.role === UserRole.Admin;
  }

  // Options shown in the edit Role dropdown. For Admin rows we expose only
  // Admin (disabled in the UI) so the seeded value renders correctly; for
  // everyone else we show the staff roles admins can assign.
  editableRoles = computed<UserRole[]>(() =>
    this.isEditingAdmin() ? [UserRole.Admin] : this.creatableRoles
  );

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const user = this.selectedUser();
    if (!user) return;
    this.formLoading.set(true);

    const v = this.editForm.value;
    const payload = { userName: v.userName!, email: v.email!, role: v.role!, status: v.status! };

    this.userService.update(user.userId, payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.panel.set('none');
        this.showToast('User updated successfully.', 'success');
        this.loadUsers();
      },
      error: err => {
        this.formLoading.set(false);
        this.showToast(err?.error?.message || 'Failed to update user.', 'error');
      }
    });
  }

  // ── Soft delete (Admin role protected) ────────────────────────
  isAdminRow(user: User): boolean {
    return user.role === UserRole.Admin;
  }

  openDelete(user: User): void {
    // Defence in depth — the button is also hidden in the template for Admin rows.
    if (this.isAdminRow(user)) {
      this.showToast('Admin accounts cannot be deleted.', 'error');
      return;
    }
    this.selectedUser.set(user);
    this.panel.set('delete');
  }

  confirmDelete(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.formLoading.set(true);

    this.userService.delete(user.userId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.panel.set('none');
        this.showToast(`User "${user.userName}" deleted.`, 'success');
        this.loadUsers();
      },
      error: err => {
        this.formLoading.set(false);
        this.showToast(err?.error?.message || 'Failed to delete user.', 'error');
      }
    });
  }

  closePanel(): void { this.panel.set('none'); this.selectedUser.set(null); }

  // ── Helpers ────────────────────────────────────────────────────
  getMeta(role: string): RoleMeta {
    return this.roleMeta[role] ?? { label: role, color: 'text-gray-400', bg: 'bg-gray-500/15', ring: 'ring-gray-500/30' };
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
