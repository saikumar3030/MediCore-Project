import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  success = signal(false);
  showPassword = signal(false);
  showConfirm = signal(false);

  /** True only when the caller is an authenticated Admin */
  readonly isAdmin = computed(() => this.authService.currentUser()?.role === UserRole.Admin);

  /** Roles available in the dropdown — admins see all except Admin; others see only Patient */
  readonly availableRoles = computed(() =>
    this.isAdmin()
      ? [
          { value: UserRole.Patient,        label: 'Patient',         description: 'Book appointments & view records' },
          { value: UserRole.Doctor,         label: 'Doctor',          description: 'Manage patients and EMR' },
          { value: UserRole.Pharmacist,     label: 'Pharmacist',      description: 'Manage medicines & dispensing' },
          { value: UserRole.Lab_Technician, label: 'Lab Technician',  description: 'Process lab tests & reports' },
          { value: UserRole.Finance_Officer,label: 'Finance Officer', description: 'Billing and payments' }
        ]
      : [{ value: UserRole.Patient, label: 'Patient', description: 'Book appointments & view records' }]
  );

  // Backend GenderOption: Male=1, Female=2, Other=3
  readonly genderOptions = [
    { value: 1, label: 'Male' },
    { value: 2, label: 'Female' },
    { value: 3, label: 'Other' }
  ];

  form = this.fb.group({
    userName:        ['', [Validators.required, Validators.minLength(3)]],
    email:           ['', [Validators.required, Validators.email]],
    role:            [UserRole.Patient, Validators.required],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    // Patient profile fields (shown only when role === Patient)
    dob:        [''],
    gender:     [1],
    address:    [''],
    phone:      [''],
    insuranceID:['']
  }, { validators: passwordMatchValidator });

  get selectedRole(): UserRole { return this.form.get('role')?.value as UserRole; }
  get isPatientRole(): boolean { return this.selectedRole === UserRole.Patient; }

  get passwordMismatch(): boolean {
    return this.form.hasError('passwordMismatch') && !!this.form.get('confirmPassword')?.touched;
  }

  togglePassword(): void { this.showPassword.update(v => !v); }
  toggleConfirm():  void { this.showConfirm.update(v => !v); }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Validate required patient fields
    if (this.isPatientRole && !this.form.get('dob')?.value) {
      this.form.get('dob')?.setErrors({ required: true });
      this.form.get('dob')?.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

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
          phone:       v.phone || undefined,
          insuranceID: v.insuranceID || undefined
        }
      })
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => {
          if (this.isAdmin()) {
            this.router.navigate(['/users']);
          } else {
            this.router.navigate(['/login']);
          }
        }, 2500);
      },
      error: (err) => {
        this.loading.set(false);
        // Some backends return 200/201 but Angular still routes to error (e.g. non-JSON body).
        // Treat any 2xx-range status as success.
        if (err?.status >= 200 && err?.status < 300) {
          this.success.set(true);
          setTimeout(() => {
            if (this.isAdmin()) {
              this.router.navigate(['/users']);
            } else {
              this.router.navigate(['/login']);
            }
          }, 2500);
          return;
        }
        const msg = err?.error?.message ?? err?.error?.title ?? err?.error;
        this.error.set(typeof msg === 'string' ? msg : 'Registration failed. Please try again.');
      }
    });
  }
}
