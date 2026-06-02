import { UserRole } from '../../core/models/user.model';

export interface NavItem {
  label: string;
  route: string;
  svgPath: string;
  roles: UserRole[];
  section: 'main' | 'oversight';
  badge?: number;
  exact?: boolean;
  queryParams?: Record<string, string>;
}

export const ICONS = {
  dashboard:    'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
  staff:        'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  patient:      'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  appointments: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  emr:          'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  pharmacy:     'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM12 8v8m-4-4h8',
  lab:          'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  billing:      'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  settings:     'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  calendar:     'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  document:     'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

export const NAV_ITEMS: NavItem[] = [
  // Admin nav
  { label: 'Dashboard',    route: '/admin',        svgPath: ICONS.dashboard,    section: 'main',      exact: true, roles: [UserRole.Admin] },
  { label: 'Staff',        route: '/users',        svgPath: ICONS.staff,        section: 'main',      roles: [UserRole.Admin] },
  { label: 'Patients',     route: '/patients',     svgPath: ICONS.patient,      section: 'main',      roles: [UserRole.Admin] },
  { label: 'Appointments', route: '/appointments', svgPath: ICONS.appointments, section: 'main',      roles: [UserRole.Admin] },
  { label: 'Billing',      route: '/billing',      svgPath: ICONS.billing,      section: 'oversight', roles: [UserRole.Admin] },
  { label: 'Settings',     route: '/profile',      svgPath: ICONS.settings,     section: 'oversight', roles: [UserRole.Admin] },
  // Non-admin nav
  { label: 'Dashboard',       route: '/dashboard',    svgPath: ICONS.dashboard,    section: 'main', exact: true, roles: [UserRole.Doctor, UserRole.Patient, UserRole.Pharmacist, UserRole.Lab_Technician, UserRole.Finance_Officer] },
  { label: 'Appointments',    route: '/appointments', svgPath: ICONS.appointments, section: 'main', roles: [UserRole.Doctor, UserRole.Patient] },
  { label: 'Schedule',        route: '/schedule',     svgPath: ICONS.calendar,     section: 'main', roles: [UserRole.Doctor] },
  { label: 'Medical Records', route: '/emr',          svgPath: ICONS.emr,          section: 'main', roles: [UserRole.Patient] },
  { label: 'Pharmacy',        route: '/pharmacy',     svgPath: ICONS.pharmacy,     section: 'main', roles: [UserRole.Pharmacist] },
  { label: 'Laboratory',      route: '/lab',          svgPath: ICONS.lab,          section: 'main', roles: [UserRole.Doctor, UserRole.Lab_Technician] },
  { label: 'Billing',         route: '/billing',      svgPath: ICONS.billing,      section: 'main', roles: [UserRole.Finance_Officer, UserRole.Patient] },
];
