import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { UserRole, User } from '../../core/models/user.model';
import { AppointmentService } from '../../core/services/appointment.service';
import { LabService } from '../../core/services/lab.service';
import { BillingService } from '../../core/services/billing.service';
import { PharmacyService } from '../../core/services/pharmacy.service';
import { PatientService } from '../../core/services/patient.service';
import { UserService } from '../../core/services/user.service';

import { Appointment, AppointmentStatus, Schedule, ScheduleStatus } from '../../core/models/appointment.model';
import { LabTest, LabTestStatus, normalizeLabTestStatus } from '../../core/models/lab.model';
import { Bill, BillStatus } from '../../core/models/billing.model';
import { Medicine, Dispense, IssuedPrescription } from '../../core/models/pharmacy.model';
import { PatientDocument, DocType, DOC_TYPE_OPTIONS } from '../../core/models/patient.model';
import { localTodayISO, isPastDateTime } from '../../core/utils/datetime';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyPipe],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private auth        = inject(AuthService);
  private router      = inject(Router);
  private appointmentService     = inject(AppointmentService);
  private labService      = inject(LabService);
  private billingService  = inject(BillingService);
  private pharmacyService = inject(PharmacyService);
  private patientService  = inject(PatientService);
  private userService     = inject(UserService);

  currentUser   = this.auth.currentUser;
  readonly UserRole = UserRole;

  // Raw data
  appointments  = signal<Appointment[]>([]);
  labTests      = signal<LabTest[]>([]);
  bills         = signal<Bill[]>([]);
  medicines     = signal<Medicine[]>([]);
  dispenses     = signal<Dispense[]>([]);
  issuedPrescriptions = signal<IssuedPrescription[]>([]);
  totalPatients = signal(0);

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  // ── Doctor ──────────────────────────────────────────────────────
  pendingAppointments     = computed(() => this.appointments().filter(a => a.status === AppointmentStatus.Pending));
  completedAppointments   = computed(() => this.appointments().filter(a => a.status === AppointmentStatus.Completed));
  // Doctor's own tests that are Requested or InProgress.
  pendingLabOrders = computed(() => {
    const me = this.currentUser()?.userId;
    if (!me) return [];
    return this.labTests().filter(t => {
      if (t.doctor?.userId !== me) return false;
      const status = normalizeLabTestStatus(t.status);
      return status === LabTestStatus.Requested
          || status === LabTestStatus.InProgress;
    });
  });

  // ── Patient ─────────────────────────────────────────────────────
  unpaidBills     = computed(() => this.bills().filter(b => (b.amount ?? 0) - (b.paidAmount ?? 0) > 0));
  labResultsReady = computed(() => this.labTests().filter(t => !!t.report));
  paidTotal       = computed(() => this.bills().reduce((s, b) => s + (b.paidAmount || 0), 0));

  // ── Lab Technician ──────────────────────────────────────────────
  // Status arrives as a string from the backend — normalize before comparing.
  pendingTests    = computed(() => this.labTests().filter(t => normalizeLabTestStatus(t.status) === LabTestStatus.Requested));
  inProgressTests = computed(() => this.labTests().filter(t => normalizeLabTestStatus(t.status) === LabTestStatus.InProgress));
  completedTests  = computed(() => this.labTests().filter(t => normalizeLabTestStatus(t.status) === LabTestStatus.Completed || !!t.report));

  // ── Pharmacist ──────────────────────────────────────────────────
  pendingDispenses = computed(() => this.dispenses().filter(d => d.status === 'Pending'));
  dispensedItems   = computed(() => this.dispenses().filter(d => d.status === 'Dispensed'));
  lowStock         = computed(() => this.medicines().filter(m => m.stock < 20 && m.status === 'Active'));
  activeMedicines  = computed(() => this.medicines().filter(m => m.status === 'Active'));

  // ── Finance Officer ─────────────────────────────────────────────
  totalRevenue    = computed(() => this.bills().reduce((s, b) => s + (b.paidAmount || 0), 0));
  overdueBills    = computed(() => this.bills().filter(b => b.status === BillStatus.Overdue));
  pendingBillList = computed(() => this.bills().filter(b => [BillStatus.Pending, BillStatus.Issued].includes(b.status)));
  recentBills     = computed(() => [...this.bills()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6));

  // ── Book Appointment (Patient) ───────────────────────────────────
  showBooking      = signal(false);
  doctors          = signal<User[]>([]);
  selectedDoctorId = signal('');
  selectedDate     = signal('');
  availableSlots   = signal<Schedule[]>([]);
  selectedSlotId   = signal('');
  bookingNotes     = signal('');
  bookingLoading   = signal(false);
  bookingSlotsLoading = signal(false);
  bookingError     = signal('');
  bookingSuccess   = signal(false);

  readonly todayISO = localTodayISO();

  // ── Patient quick-upload widget ───────────────────────────────────
  patientDocs       = signal<PatientDocument[]>([]);
  readonly docTypeOptions = DOC_TYPE_OPTIONS;
  uploadDocType     = signal<DocType>(DocType.IDProof);
  pendingDocFile    = signal<File | null>(null);
  uploadDocLoading  = signal(false);
  uploadDocError    = signal('');
  uploadDocSuccess  = signal(false);

  onDocFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingDocFile.set(input.files?.[0] ?? null);
    this.uploadDocError.set('');
  }

  setUploadDocType(type: DocType): void {
    this.uploadDocType.set(type);
  }

  uploadPatientDocument(): void {
    const file = this.pendingDocFile();
    const user = this.currentUser();
    if (!file || !user) {
      this.uploadDocError.set('Please choose a file to upload.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.uploadDocError.set('File must be 10 MB or smaller.');
      return;
    }
    this.uploadDocLoading.set(true);
    this.uploadDocError.set('');
    this.patientService.uploadDocument(file, this.uploadDocType()).subscribe({
      next: () => {
        this.uploadDocLoading.set(false);
        this.uploadDocSuccess.set(true);
        this.pendingDocFile.set(null);
        const el = document.getElementById('dashboard-doc-file') as HTMLInputElement | null;
        if (el) el.value = '';
        this.patientService.getDocumentsByPatientId(user.userId)
          .pipe(catchError(() => of<PatientDocument[]>([])))
          .subscribe(docs => this.patientDocs.set(docs));
        setTimeout(() => this.uploadDocSuccess.set(false), 2500);
      },
      error: err => {
        this.uploadDocLoading.set(false);
        this.uploadDocError.set(
          err?.response?.data?.message ?? err?.message ?? 'Upload failed.'
        );
      }
    });
  }

  docTypeLabel(type: string): string {
    return DOC_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
  }

  openBooking(): void {
    this.selectedDoctorId.set('');
    this.selectedDate.set('');
    this.availableSlots.set([]);
    this.selectedSlotId.set('');
    this.bookingNotes.set('');
    this.bookingError.set('');
    this.bookingSuccess.set(false);
    this.showBooking.set(true);
  }

  closeBooking(): void {
    this.showBooking.set(false);
    this.bookingSuccess.set(false);
    this.bookingError.set('');
  }

  onDoctorOrDateChange(): void {
    const doctorId = this.selectedDoctorId();
    const date     = this.selectedDate();
    this.selectedSlotId.set('');
    this.availableSlots.set([]);
    if (!doctorId || !date) return;

    if (isPastDateTime(date, '23:59')) {
      this.bookingError.set('You cannot book an appointment for a past date.');
      return;
    }
    this.bookingError.set('');

    this.bookingSlotsLoading.set(true);
    this.appointmentService.getSchedules(doctorId, date).pipe(catchError(() => of<Schedule[]>([]))).subscribe(slots => {
      this.bookingSlotsLoading.set(false);
      this.availableSlots.set(slots.filter(s =>
        s.availability === ScheduleStatus.Available && !isPastDateTime(s.date, s.timeSlot)
      ));
    });
  }

  bookAppointment(): void {
    const slot = this.availableSlots().find(s => s.scheduleID === this.selectedSlotId());
    if (!slot) {
      this.bookingError.set('Please select an available time slot.');
      return;
    }
    if (isPastDateTime(slot.date, slot.timeSlot)) {
      this.bookingError.set('You cannot book an appointment for a past date or time.');
      return;
    }
    this.bookingLoading.set(true);
    this.bookingError.set('');

    this.appointmentService.book({
      doctorID: slot.doctorID,
      date:     slot.date,
      time:     slot.timeSlot,
      notes:    this.bookingNotes() || undefined
    }).subscribe({
      next: (appt) => {
        this.bookingLoading.set(false);
        this.bookingSuccess.set(true);
        this.appointments.update(list => [appt, ...list]);
        setTimeout(() => this.closeBooking(), 2500);
      },
      error: (err) => {
        this.bookingLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.response?.data?.title ?? err?.message;
        this.bookingError.set(typeof msg === 'string' ? msg : 'Booking failed. Please try again.');
      }
    });
  }

  ngOnInit(): void {
    const role = this.currentUser()?.role;

    // Admin has a dedicated route
    if (role === UserRole.Admin) {
      this.router.navigate(['/admin']);
      return;
    }

    if (role === UserRole.Doctor) {
      forkJoin({
        appts:    this.appointmentService.getAll().pipe(catchError(() => of<Appointment[]>([]))),
        patients: this.patientService.getAll().pipe(catchError(() => of([]))),
        tests:    this.labService.getTests().pipe(catchError(() => of<LabTest[]>([])))
      }).subscribe(({ appts, patients, tests }) => {
        this.appointments.set(appts);
        this.totalPatients.set(patients.length);
        this.labTests.set(tests);
      });
    }

    if (role === UserRole.Patient) {
      const user = this.currentUser();
      // Patients need their own bills/tests via the patient-scoped endpoints —
      // getBills() and getTests() are restricted to admin/doctor/finance roles.
      const bills$ = user
        ? this.billingService.getBillsByPatient(user.userId).pipe(catchError(() => of<Bill[]>([])))
        : of<Bill[]>([]);
      const tests$ = user
        ? this.labService.getTestsByPatient(user.userId).pipe(catchError(() => of<LabTest[]>([])))
        : of<LabTest[]>([]);
      const docs$ = user
        ? this.patientService.getDocumentsByPatientId(user.userId).pipe(catchError(() => of<PatientDocument[]>([])))
        : of<PatientDocument[]>([]);
      forkJoin({
        appts:   this.appointmentService.getAll().pipe(catchError(() => of<Appointment[]>([]))),
        bills:   bills$,
        tests:   tests$,
        doctors: this.userService.getAllDoctors().pipe(catchError(() => of<User[]>([]))),
        docs:    docs$
      }).subscribe(({ appts, bills, tests, doctors, docs }) => {
        this.appointments.set(appts);
        this.bills.set(bills);
        this.labTests.set(tests);
        this.doctors.set(doctors);
        this.patientDocs.set(docs);
      });
    }

    if (role === UserRole.Lab_Technician) {
      const user = this.currentUser();
      if (!user) return;

      this.labService.getTestsByTechnician(user.userId)
        .pipe(catchError(() => of<LabTest[]>([])))
        .subscribe(tests => {
          this.labTests.set(tests);
        });
    }

    if (role === UserRole.Pharmacist) {
      forkJoin({
        medicines:   this.pharmacyService.getMedicines().pipe(catchError(() => of<Medicine[]>([]))),
        dispenses:   this.pharmacyService.getDispenses().pipe(catchError(() => of<Dispense[]>([]))),
        prescriptions: this.pharmacyService.getIssuedPrescriptions().pipe(catchError(() => of<IssuedPrescription[]>([])))
      }).subscribe(({ medicines, dispenses, prescriptions }) => {
        this.medicines.set(medicines);
        this.dispenses.set(dispenses);
        this.issuedPrescriptions.set(prescriptions);
      });
    }

    if (role === UserRole.Finance_Officer) {
      this.billingService.getBills().pipe(catchError(() => of<Bill[]>([]))).subscribe(bills => {
        this.bills.set(bills);
      });
    }
  }

  apptStatusClass(s: AppointmentStatus): string {
    const m: Record<string, string> = {
      [AppointmentStatus.Pending]:     'bg-amber-500/15 text-amber-400',
      [AppointmentStatus.Completed]:   'bg-green-500/15 text-green-400',
      [AppointmentStatus.Cancelled]:   'bg-red-500/15 text-red-400',
      [AppointmentStatus.Rescheduled]: 'bg-blue-500/15 text-blue-400',
    };
    return m[s] ?? 'bg-slate-500/15 text-slate-400';
  }

  labStatusClass(s: LabTestStatus | string | number): string {
    const m: Record<number, string> = {
      [LabTestStatus.Requested]:  'bg-amber-500/15 text-amber-400',
      [LabTestStatus.InProgress]: 'bg-blue-500/15 text-blue-400',
      [LabTestStatus.Completed]:  'bg-green-500/15 text-green-400',
      [LabTestStatus.Cancelled]:  'bg-red-500/15 text-red-400',
    };
    const normalized = normalizeLabTestStatus(s);
    return (normalized !== null && m[normalized]) || 'bg-slate-500/15 text-slate-400';
  }

  billStatusClass(s: BillStatus): string {
    const m: Record<string, string> = {
      [BillStatus.Paid]:      'bg-green-500/15 text-green-400',
      [BillStatus.Pending]:   'bg-amber-500/15 text-amber-400',
      [BillStatus.Issued]:    'bg-blue-500/15 text-blue-400',
      [BillStatus.Overdue]:   'bg-red-500/15 text-red-400',
      [BillStatus.Partial]:   'bg-orange-500/15 text-orange-400',
      [BillStatus.Draft]:     'bg-slate-500/15 text-slate-400',
      [BillStatus.Cancelled]: 'bg-slate-500/15 text-slate-400',
    };
    return m[s] ?? 'bg-slate-500/15 text-slate-400';
  }

  shortId(id: string): string {
    return id ? '#' + id.substring(0, 8).toUpperCase() : '—';
  }
}
