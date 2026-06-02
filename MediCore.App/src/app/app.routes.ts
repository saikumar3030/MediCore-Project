import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/user.model';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] }
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users.component').then(m => m.UsersComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] }
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./features/patients/patients.component').then(m => m.PatientsComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Doctor] }
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/appointments/appointments.component').then(m => m.AppointmentsComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Doctor, UserRole.Patient] }
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/schedule/schedule.component').then(m => m.ScheduleComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Doctor] }
      },
      {
        path: 'emr',
        loadComponent: () =>
          import('./features/emr/emr.component').then(m => m.EmrComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Doctor, UserRole.Patient] }
      },
      {
        path: 'pharmacy',
        loadComponent: () =>
          import('./features/pharmacy/pharmacy.component').then(m => m.PharmacyComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Doctor, UserRole.Pharmacist] }
      },
      {
        path: 'lab',
        loadComponent: () =>
          import('./features/lab/lab.component').then(m => m.LabComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Doctor, UserRole.Lab_Technician, UserRole.Patient] }
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./features/billing/billing.component').then(m => m.BillingComponent),
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Finance_Officer, UserRole.Patient, UserRole.Doctor, UserRole.Pharmacist] }
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
