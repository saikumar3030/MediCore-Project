import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { PatientService } from '../../core/services/patient.service';
import { LabService } from '../../core/services/lab.service';
import { BillingService } from '../../core/services/billing.service';
import { AppointmentService } from '../../core/services/appointment.service';

import { User, UserRole, UserStatus } from '../../core/models/user.model';
import { LabTest, LabTestStatus, normalizeLabTestStatus } from '../../core/models/lab.model';
import { Bill } from '../../core/models/billing.model';
import { Appointment } from '../../core/models/appointment.model';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm  = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

interface StaffMember {
  userId: string;
  initials: string;
  name: string;
  role: string;
  avatarBg: string;
  status: 'Active' | 'Inactive';
}

interface RoleCount {
  role: UserRole;
  label: string;
  count: number;
  color: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  private authService       = inject(AuthService);
  private userService       = inject(UserService);
  private patientService    = inject(PatientService);
  private labService        = inject(LabService);
  private billingService    = inject(BillingService);
  private appointmentService = inject(AppointmentService);
  private fb                = inject(FormBuilder);

  currentUser = this.authService.currentUser;

  // ── Loading / errors ──────────────────────────────────────────────────────
  loading       = signal(true);
  loadError     = signal('');
  lastUpdated   = signal<Date | null>(null);

  // ── Raw data from backend ─────────────────────────────────────────────────
  private users         = signal<User[]>([]);
  private appointments  = signal<Appointment[]>([]);
  private labTests      = signal<LabTest[]>([]);
  private bills         = signal<Bill[]>([]);

  // ── Derived stats (all real, computed from backend) ───────────────────────
  totalUsers   = computed(() => this.users().length);
  staffUsers   = computed(() => this.users().filter(u => u.role !== UserRole.Patient && u.role !== UserRole.Admin));
  patientUsers = computed(() => this.users().filter(u => u.role === UserRole.Patient));
  activeStaff  = computed(() => this.staffUsers().filter(u => u.status === UserStatus.Active).length);

  todayISO = new Date().toISOString().split('T')[0];

  appointmentsToday = computed(() =>
    this.appointments().filter(a => (a.date ?? '').startsWith(this.todayISO))
  );
  appointmentsPending = computed(() =>
    this.appointments().filter(a => (a.status as unknown as string) === 'Pending').length
  );
  appointmentsCompleted = computed(() =>
    this.appointments().filter(a => (a.status as unknown as string) === 'Completed').length
  );
  appointmentsCancelled = computed(() =>
    this.appointments().filter(a => (a.status as unknown as string) === 'Cancelled').length
  );

  pendingLabTests = computed(() =>
    this.labTests().filter(t => normalizeLabTestStatus(t.status) === LabTestStatus.Requested).length
  );
  inProgressLabTests = computed(() =>
    this.labTests().filter(t => normalizeLabTestStatus(t.status) === LabTestStatus.InProgress).length
  );
  completedLabTests = computed(() =>
    this.labTests().filter(t => normalizeLabTestStatus(t.status) === LabTestStatus.Completed).length
  );

  outstandingBalance = computed(() =>
    this.bills().reduce((sum, b) => sum + Math.max(0, (b.amount ?? 0) - (b.paidAmount ?? 0)), 0)
  );
  totalBilled = computed(() =>
    this.bills().reduce((sum, b) => sum + (b.amount ?? 0), 0)
  );
  totalPaid = computed(() =>
    this.bills().reduce((sum, b) => sum + (b.paidAmount ?? 0), 0)
  );
  unpaidBills = computed(() =>
    this.bills().filter(b => (b.amount ?? 0) - (b.paidAmount ?? 0) > 0).length
  );
  totalBillsCount = computed(() => this.bills().length);

  // ── Today's appointments (sorted by time) ─────────────────────────────────
  todaysAppointmentsSorted = computed(() =>
    [...this.appointmentsToday()].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  );

  // ── Staff list (real, sorted: active first) ───────────────────────────────
  staffOnline = computed<StaffMember[]>(() =>
    this.staffUsers()
      .sort((a, b) => {
        if (a.status === b.status) return a.userName.localeCompare(b.userName);
        return a.status === UserStatus.Active ? -1 : 1;
      })
      .map(u => ({
        userId:   u.userId,
        initials: this.initials(u.userName),
        name:     u.userName,
        role:     u.role.replace('_', ' '),
        avatarBg: this.roleColor(u.role),
        status:   u.status === UserStatus.Active ? 'Active' as const : 'Inactive' as const,
      }))
  );

  // ── Per-role breakdown ────────────────────────────────────────────────────
  roleBreakdown = computed<RoleCount[]>(() => {
    const roles: { role: UserRole; label: string; color: string }[] = [
      { role: UserRole.Doctor,          label: 'Doctors',         color: '#2563eb' },
      { role: UserRole.Pharmacist,      label: 'Pharmacists',     color: '#be185d' },
      { role: UserRole.Lab_Technician,  label: 'Lab Technicians', color: '#7c3aed' },
      { role: UserRole.Finance_Officer, label: 'Finance',         color: '#b45309' },
      { role: UserRole.Patient,         label: 'Patients',        color: '#475569' },
    ];
    return roles.map(r => ({
      ...r,
      count: this.users().filter(u => u.role === r.role).length,
    }));
  });

  // ══ Add User modal (kept — working feature) ═══════════════════════════════
  showModal       = signal(false);
  modalLoading    = signal(false);
  modalError      = signal('');
  modalSuccess    = signal(false);
  showPassword    = signal(false);
  showConfirm     = signal(false);

  readonly availableRoles = [
    { value: UserRole.Patient,         label: 'Patient',         description: 'Book appointments & view records' },
    { value: UserRole.Doctor,          label: 'Doctor',          description: 'Manage patients and EMR' },
    { value: UserRole.Pharmacist,      label: 'Pharmacist',      description: 'Manage medicines & dispensing' },
    { value: UserRole.Lab_Technician,  label: 'Lab Technician',  description: 'Process lab tests & reports' },
    { value: UserRole.Finance_Officer, label: 'Finance Officer', description: 'Billing and payments' },
  ];

  // Backend GenderOption: Male=1, Female=2, Other=3
  readonly genderOptions = [
    { value: 1, label: 'Male' },
    { value: 2, label: 'Female' },
    { value: 3, label: 'Other' },
  ];

  form = this.fb.group({
    userName:        ['', [Validators.required, Validators.minLength(3)]],
    email:           ['', [Validators.required, Validators.email]],
    role:            [UserRole.Patient, Validators.required],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    dob:             [''],
    gender:          [1],
    address:         [''],
    phone:           [''],
    insuranceID:     [''],
  }, { validators: passwordMatchValidator });

  get selectedRole(): UserRole { return this.form.get('role')?.value as UserRole; }
  get isPatientRole(): boolean { return this.selectedRole === UserRole.Patient; }
  get passwordMismatch(): boolean {
    return this.form.hasError('passwordMismatch') && !!this.form.get('confirmPassword')?.touched;
  }

  openModal(): void {
    this.form.reset({ role: UserRole.Patient, gender: 1 });
    this.modalError.set('');
    this.modalSuccess.set(false);
    this.showPassword.set(false);
    this.showConfirm.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalSuccess.set(false);
    this.modalError.set('');
  }

  togglePassword(): void { this.showPassword.update(v => !v); }
  toggleConfirm():  void { this.showConfirm.update(v => !v); }

  submitModal(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.isPatientRole && !this.form.get('dob')?.value) {
      this.form.get('dob')?.setErrors({ required: true });
      this.form.get('dob')?.markAsTouched();
      return;
    }

    this.modalLoading.set(true);
    this.modalError.set('');

    const v = this.form.value;
    const payload = {
      userName: v.userName!,
      email:    v.email!,
      password: v.password!,
      role:     v.role!,
      status:   'Active',
      ...(this.isPatientRole && {
        patientRequestDtos: {
          dob:         v.dob!,
          gender:      Number(v.gender),
          address:     v.address || undefined,
          phone:       v.phone   || undefined,
          insuranceID: v.insuranceID || undefined,
        }
      })
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.modalSuccess.set(true);
        // Refresh real data so totals reflect the new user
        this.loadAll();
        setTimeout(() => this.closeModal(), 2000);
      },
      error: (err) => {
        this.modalLoading.set(false);
        if (err?.status >= 200 && err?.status < 300) {
          this.modalSuccess.set(true);
          this.loadAll();
          setTimeout(() => this.closeModal(), 2000);
          return;
        }
        const msg = err?.error?.message ?? err?.error?.title ?? err?.error;
        this.modalError.set(typeof msg === 'string' ? msg : 'Registration failed. Please try again.');
      }
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set('');

    forkJoin({
      users:        this.userService.getAll().pipe(catchError(() => of<User[]>([]))),
      appointments: this.appointmentService.getAll().pipe(catchError(() => of<Appointment[]>([]))),
      tests:        this.labService.getTests().pipe(catchError(() => of<LabTest[]>([]))),
      bills:        this.billingService.getBills().pipe(catchError(() => of<Bill[]>([])))
    }).subscribe({
      next: ({ users, appointments, tests, bills }) => {
        this.users.set(users);
        this.appointments.set(appointments);
        this.labTests.set(tests);
        this.bills.set(bills);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.message ?? 'Failed to load dashboard data.');
        this.loading.set(false);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatTime(time: string | undefined): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    return `${hour}:${(m ?? 0).toString().padStart(2, '0')} ${period}`;
  }

  // Public so templates can compute initials too (used by Today's Appointments avatar).
  initials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  private roleColor(role: UserRole): string {
    const map: Record<string, string> = {
      [UserRole.Doctor]:          '#2563eb',
      [UserRole.Pharmacist]:      '#be185d',
      [UserRole.Lab_Technician]:  '#7c3aed',
      [UserRole.Finance_Officer]: '#b45309',
      [UserRole.Patient]:         '#475569',
    };
    return map[role] ?? '#334155';
  }

  appointmentStatusClass(status: string): string {
    const map: Record<string, string> = {
      Pending:     'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
      Completed:   'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
      Cancelled:   'bg-red-500/15 text-red-400 ring-red-500/30',
      Rescheduled: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
      Confirmed:   'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
    };
    return map[status] || 'bg-slate-700/50 text-slate-400 ring-slate-600/40';
  }

  staffStatusDotClass(status: string): string {
    return status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500';
  }

  staffStatusTextClass(status: string): string {
    return status === 'Active' ? 'text-emerald-400' : 'text-slate-400';
  }
}
