import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { AppointmentService } from '../../core/services/appointment.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { PatientService } from '../../core/services/patient.service';
import { EmrService } from '../../core/services/emr.service';
import { LabService } from '../../core/services/lab.service';

import { Appointment, AppointmentStatus, Schedule } from '../../core/models/appointment.model';
import { User, UserRole } from '../../core/models/user.model';
import { Patient, PatientDocument } from '../../core/models/patient.model';
import { LabTest, LabTestType, CreateLabTestRequest, LAB_TEST_TYPE_OPTIONS } from '../../core/models/lab.model';
import { EMR, CreatePrescriptionRequest } from '../../core/models/emr.model';
import { localTodayISO, isPastDateTime } from '../../core/utils/datetime';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.component.html'
})
export class AppointmentsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private authService    = inject(AuthService);
  private userService        = inject(UserService);
  private patientService     = inject(PatientService);
  private emrService         = inject(EmrService);
  private labService         = inject(LabService);
  private router         = inject(Router);

  appointments = signal<Appointment[]>([]);
  loading      = signal(false);
  error        = signal('');
  success      = signal('');

  currentUser = this.authService.currentUser;
  isDoctor    = computed(() => this.authService.hasRole(UserRole.Doctor));
  isPatient   = computed(() => this.authService.hasRole(UserRole.Patient));
  isAdmin     = computed(() => this.authService.hasRole(UserRole.Admin));
  // The 3-column scheduled/completed/cancelled layout is used by both Doctor and Admin.
  showDoctorLayout = computed(() => this.isDoctor() || this.isAdmin());

  // ── Doctor view: patients lookup + per-status search ──────────────────────
  patients   = signal<User[]>([]);
  patientMap = computed(() => new Map(this.patients().map(p => [p.userId, p])));

  // ── Patient view: status filter ───────────────────────────────────────────
  patientFilter = signal<'All' | 'Pending' | 'Completed' | 'Cancelled'>('All');

  filteredPatientAppointments = computed(() => {
    const f = this.patientFilter();
    if (f === 'All') return this.appointments();
    return this.appointments().filter(a => (a.status as string) === f);
  });

  scheduledSearch = signal('');
  completedSearch = signal('');
  cancelledSearch = signal('');

  scheduledAppointments = computed(() => {
    const q = this.scheduledSearch().toLowerCase().trim();
    return this.appointments()
      .filter(a => (a.status as string) === 'Pending' || (a.status as string) === 'Rescheduled')
      .filter(a => {
        if (!q) return true;
        return (a.patient?.userId ?? '').toLowerCase().includes(q)
          || (a.patient?.userName ?? '').toLowerCase().includes(q)
          || (a.patient?.email    ?? '').toLowerCase().includes(q);
      });
  });

  completedAppointments = computed(() => {
    const q = this.completedSearch().toLowerCase().trim();
    return this.appointments()
      .filter(a => (a.status as string) === 'Completed')
      .filter(a => {
        if (!q) return true;
        return (a.patient?.userId ?? '').toLowerCase().includes(q)
          || (a.patient?.userName ?? '').toLowerCase().includes(q)
          || (a.patient?.email    ?? '').toLowerCase().includes(q);
      });
  });

  cancelledAppointments = computed(() => {
    const q = this.cancelledSearch().toLowerCase().trim();
    return this.appointments()
      .filter(a => (a.status as string) === 'Cancelled')
      .filter(a => {
        if (!q) return true;
        return (a.patient?.userId ?? '').toLowerCase().includes(q)
          || (a.patient?.userName ?? '').toLowerCase().includes(q)
          || (a.patient?.email    ?? '').toLowerCase().includes(q);
      });
  });

  // ── Patient detail panel ──────────────────────────────────────────────────
  showPatientPanel     = signal(false);
  selectedPatientId    = signal('');
  selectedAppointment  = signal<Appointment | null>(null);
  patientDetail        = signal<Patient | null>(null);
  patientDocs          = signal<PatientDocument[]>([]);
  patientEmrs          = signal<EMR[]>([]);
  patientLabs          = signal<LabTest[]>([]);
  patientPanelLoading  = signal(false);
  patientPanelError    = signal('');

  openPatientPanel(appt: Appointment): void {
    const patientId = appt.patient?.userId ?? '';
    if (!patientId) return;
    this.showPatientPanel.set(true);
    this.selectedAppointment.set(appt);
    this.selectedPatientId.set(patientId);
    this.patientDetail.set(null);
    this.patientDocs.set([]);
    this.patientEmrs.set([]);
    this.patientLabs.set([]);
    this.patientPanelError.set('');
    this.patientPanelLoading.set(true);

    forkJoin({
      profile: this.patientService.getById(patientId).pipe(catchError(() => of<Patient | null>(null))),
      docs:    this.patientService.getDocumentsByPatientId(patientId).pipe(catchError(() => of<PatientDocument[]>([]))),
      emrs:    this.emrService.getByPatient(patientId).pipe(catchError(() => of<EMR[]>([]))),
      labs:    this.labService.getTestsByPatient(patientId).pipe(catchError(() => of<LabTest[]>([])))
    }).subscribe(({ profile, docs, emrs, labs }) => {
      this.patientPanelLoading.set(false);
      this.patientDetail.set(profile);
      this.patientDocs.set(docs);
      this.patientEmrs.set(emrs);
      this.patientLabs.set(labs);
      this.selectedEmrId.set(emrs.length > 0 ? emrs[0].emrid : '');
    });
  }

  closePatientPanel(): void {
    this.showPatientPanel.set(false);
    this.showEmrForm.set(false);
    this.showLabForm.set(false);
    this.showRxForm.set(false);
  }

  // ── EMR creation (Doctor only) ────────────────────────────────────────────
  showEmrForm      = signal(false);
  emrDiagnosis     = signal('');
  emrTreatmentPlan = signal('');
  emrLoading       = signal(false);
  emrError         = signal('');

  openEmrForm(): void {
    this.emrDiagnosis.set('');
    this.emrTreatmentPlan.set('');
    this.emrError.set('');
    this.showEmrForm.set(true);
  }

  closeEmrForm(): void {
    this.showEmrForm.set(false);
  }

  createEmr(): void {
    const patientId    = this.selectedPatientId();
    const diagnosis    = this.emrDiagnosis().trim();
    const treatmentPlan = this.emrTreatmentPlan().trim();

    if (!patientId || !diagnosis || !treatmentPlan) {
      this.emrError.set('Diagnosis and treatment plan are required.');
      return;
    }

    this.emrLoading.set(true);
    this.emrError.set('');

    this.emrService.create({ patientID: patientId, diagnosis, treatmentPlan }).subscribe({
      next: emr => {
        this.emrLoading.set(false);
        this.showEmrForm.set(false);
        this.success.set('EMR created.');
        this.patientEmrs.update(list => [emr, ...list]);
        if (!this.selectedEmrId()) this.selectedEmrId.set(emr.emrid);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.emrLoading.set(false);
        const msg = err?.error?.message ?? err?.response?.data?.message ?? err?.message;
        this.emrError.set(typeof msg === 'string' ? msg : 'Failed to create EMR.');
      }
    });
  }

  // ── Lab Test creation (Doctor only) ───────────────────────────────────────
  showLabForm           = signal(false);
  labType               = signal<LabTestType>(LabTestType.BloodTest);
  selectedTechnicianId  = signal('');
  technicians           = signal<User[]>([]);
  labLoading            = signal(false);
  labError              = signal('');
  readonly labTestTypes = LAB_TEST_TYPE_OPTIONS;

  openLabForm(): void {
    this.labType.set(LabTestType.BloodTest);
    this.selectedTechnicianId.set('');
    this.labError.set('');
    this.showLabForm.set(true);
  }

  closeLabForm(): void {
    this.showLabForm.set(false);
  }

  createLabTest(): void {
    const patientId = this.selectedPatientId();
    if (!patientId) {
      this.labError.set('Patient is required.');
      return;
    }

    const technicianId = this.selectedTechnicianId();
    if (!technicianId) {
      this.labError.set('Please select a lab technician.');
      return;
    }

    this.labLoading.set(true);
    this.labError.set('');

    const request: CreateLabTestRequest = {
      patientID: patientId,
      type: Number(this.labType()) as LabTestType,
      technicianID: technicianId
    };
    this.labService.createTest(request).subscribe({
      next: lab => {
        this.labLoading.set(false);
        this.showLabForm.set(false);
        this.success.set('Lab test created.');
        this.patientLabs.update(list => [lab, ...list]);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.labLoading.set(false);
        const msg = err?.error?.message ?? err?.response?.data?.message ?? err?.message;
        this.labError.set(typeof msg === 'string' ? msg : 'Failed to create lab test.');
      }
    });
  }

  // ── Prescription creation (Doctor only) ───────────────────────────────────
  showRxForm    = signal(false);
  selectedEmrId = signal('');
  // Each row is one prescription. The doctor can add multiple medicines at once
  // and they get POSTed in parallel to the existing single-prescription endpoint.
  rxRows        = signal<{ medicine: string; dosage: string; frequency: string; duration: string }[]>([
    { medicine: '', dosage: '', frequency: '', duration: '' }
  ]);
  rxLoading     = signal(false);
  rxError       = signal('');

  openRxForm(): void {
    this.rxRows.set([{ medicine: '', dosage: '', frequency: '', duration: '' }]);
    this.rxError.set('');
    this.showRxForm.set(true);
  }

  closeRxForm(): void {
    this.showRxForm.set(false);
  }

  addRxRow(): void {
    this.rxRows.update(rows => [...rows, { medicine: '', dosage: '', frequency: '', duration: '' }]);
  }

  removeRxRow(index: number): void {
    this.rxRows.update(rows => rows.length > 1 ? rows.filter((_, i) => i !== index) : rows);
  }

  updateRxField(index: number, field: 'medicine' | 'dosage' | 'frequency' | 'duration', value: string): void {
    this.rxRows.update(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  createPrescription(): void {
    const emrId = this.selectedEmrId();
    if (!emrId) {
      this.rxError.set('Create an EMR first before adding a prescription.');
      return;
    }

    // Trim everything, then drop rows where every field is blank — those are just
    // empty placeholder rows the doctor left around.
    const rows = this.rxRows()
      .map(r => ({
        medicine:  r.medicine.trim(),
        dosage:    r.dosage.trim(),
        frequency: r.frequency.trim(),
        duration:  r.duration.trim()
      }))
      .filter(r => r.medicine || r.dosage || r.frequency || r.duration);

    if (rows.length === 0) {
      this.rxError.set('Add at least one medicine.');
      return;
    }
    if (rows.some(r => !r.medicine || !r.dosage || !r.frequency || !r.duration)) {
      this.rxError.set('Each medicine needs a name, dosage, frequency and duration.');
      return;
    }

    this.rxLoading.set(true);
    this.rxError.set('');

    const requests = rows.map(r =>
      this.emrService.addPrescription(emrId, r as CreatePrescriptionRequest)
    );

    forkJoin(requests).subscribe({
      next: created => {
        this.rxLoading.set(false);
        this.showRxForm.set(false);
        this.success.set(`${created.length} prescription${created.length > 1 ? 's' : ''} added.`);
        // Attach all new prescriptions to their parent EMR so they show up in
        // the patient history immediately, without a refresh.
        this.patientEmrs.update(list => list.map(emr =>
          emr.emrid === emrId
            ? { ...emr, prescriptions: [...created, ...(emr.prescriptions ?? [])] }
            : emr
        ));
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.rxLoading.set(false);
        const msg = err?.error?.message ?? err?.response?.data?.message ?? err?.message;
        this.rxError.set(typeof msg === 'string' ? msg : 'Failed to add prescriptions.');
      }
    });
  }

  calcAge(dob: string): number {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  docTypeColor(type: string): string {
    const map: Record<string, string> = {
      ID:             'bg-blue-500/15 text-blue-400 ring-blue-500/30',
      Insurance:      'bg-violet-500/15 text-violet-400 ring-violet-500/30',
      MedicalHistory: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
      Other:          'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    };
    return map[type] ?? map['Other'];
  }

  // Navigate to the Lab page with this test pre-selected. The lab page reads
  // the `testId` query param on init and opens the matching test's details.
  viewLabTestDetails(testID: string): void {
    this.closePatientPanel();
    this.router.navigate(['/lab'], { queryParams: { testId: testID } });
  }

  // ── Book Appointment Modal ─────────────────────────────────────────────────
  showBookModal    = signal(false);
  doctors          = signal<User[]>([]);
  selectedDoctor   = signal<User | null>(null);
  showDoctorPicker = signal(false);
  doctorSearch     = signal('');
  selectedDate     = signal('');
  schedules        = signal<Schedule[]>([]);
  selectedSlotId   = signal('');
  bookNotes        = signal('');
  slotsLoading     = signal(false);
  bookLoading      = signal(false);
  bookError        = signal('');
  bookSuccess      = signal(false);

  readonly todayISO = localTodayISO();

  filteredDoctors = computed(() => {
    const query = this.doctorSearch().toLowerCase().trim();
    if (!query) return this.doctors();
    return this.doctors().filter(d => d.userName.toLowerCase().includes(query));
  });

  formatSlot(time: string | undefined): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAppointments();

    if (this.isPatient()) {
      this.userService.getAllDoctors()
        .pipe(catchError(() => of<User[]>([])))
        .subscribe(docs => this.doctors.set(docs));
    }

    if (this.isDoctor()) {
      this.userService.getAll()
        .pipe(catchError(() => of<User[]>([])))
        .subscribe(users => this.patients.set(users.filter(u => u.role === UserRole.Patient)));

      this.userService.getAllLabTechnicians()
        .pipe(catchError(() => of<User[]>([])))
        .subscribe(techs => this.technicians.set(techs));
    }
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.error.set('');

    this.appointmentService.getAll().subscribe({
      next: appointments => {
        this.appointments.set(appointments);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.response?.data?.message ?? err?.response?.data?.title ?? err?.message ?? 'Failed to load appointments.';
        this.error.set(msg);
      }
    });
  }

  // ── Book modal actions ─────────────────────────────────────────────────────
  openBookModal(): void {
    this.selectedDoctor.set(null);
    this.selectedDate.set('');
    this.schedules.set([]);
    this.selectedSlotId.set('');
    this.bookNotes.set('');
    this.bookError.set('');
    this.bookSuccess.set(false);
    this.doctorSearch.set('');
    this.showDoctorPicker.set(false);
    this.showBookModal.set(true);
  }

  closeBookModal(): void {
    this.showBookModal.set(false);
    this.bookSuccess.set(false);
    this.bookError.set('');
  }

  selectDoctor(doc: User): void {
    this.selectedDoctor.set(doc);
    this.showDoctorPicker.set(false);
    this.doctorSearch.set('');
    this.loadSlots();
  }

  onDateChange(val: string): void {
    this.selectedDate.set(val);
    this.loadSlots();
  }

  loadSlots(): void {
    const doctor = this.selectedDoctor();
    const date   = this.selectedDate();

    if (!doctor || !date) return;

    if (isPastDateTime(date, '23:59')) {
      this.schedules.set([]);
      this.bookError.set('You cannot book an appointment for a past date.');
      return;
    }

    this.selectedSlotId.set('');
    this.schedules.set([]);
    this.bookError.set('');
    this.slotsLoading.set(true);

    this.appointmentService.getSchedules(doctor.userId, date).subscribe({
      next: slots => {
        this.slotsLoading.set(false);
        // Hide slots whose time has already passed today.
        this.schedules.set(slots.filter(s => !isPastDateTime(s.date, s.timeSlot)));
      },
      error: err => {
        this.slotsLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.response?.data?.title ?? err?.message;
        this.bookError.set(typeof msg === 'string' ? msg : 'Failed to load time slots.');
      }
    });
  }

  bookAppointment(): void {
    const slot = this.schedules().find(s => s.scheduleID === this.selectedSlotId());
    if (!slot) {
      this.bookError.set('Please select a time slot.');
      return;
    }

    if (isPastDateTime(slot.date, slot.timeSlot)) {
      this.bookError.set('You cannot book an appointment for a past date or time.');
      return;
    }

    this.bookLoading.set(true);
    this.bookError.set('');

    this.appointmentService.book({
      doctorID: slot.doctorID,
      date:     slot.date,
      time:     slot.timeSlot,
      notes:    this.bookNotes() || undefined
    }).subscribe({
      next: appt => {
        this.bookLoading.set(false);
        this.bookSuccess.set(true);
        this.appointments.update(list => [appt, ...list]);
        setTimeout(() => this.closeBookModal(), 2500);
      },
      error: err => {
        this.bookLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.response?.data?.title ?? err?.message;
        this.bookError.set(typeof msg === 'string' ? msg : 'Booking failed. Please try again.');
      }
    });
  }


  // ── Admin edit / delete ────────────────────────────────────────────────────
  // Backend AppointmentStatus is numeric: Pending=1, Confirmed=2, Cancelled=3, Completed=4.
  readonly statusOptions: { label: string; value: number }[] = [
    { label: 'Pending',   value: 1 },
    { label: 'Confirmed', value: 2 },
    { label: 'Cancelled', value: 3 },
    { label: 'Completed', value: 4 },
  ];

  // Map status name (as returned by backend) → numeric value used by request DTO.
  private statusNameToValue(name: string): number {
    return this.statusOptions.find(o => o.label === name)?.value ?? 1;
  }

  showAdminEditModal  = signal(false);
  adminEditAppt       = signal<Appointment | null>(null);
  adminEditDate       = signal('');
  adminEditSchedules  = signal<Schedule[]>([]);
  adminEditSlotId     = signal('');
  adminEditNotes      = signal('');
  adminEditStatus     = signal<number>(1);
  adminSlotsLoading   = signal(false);
  adminRescheduleLoading = signal(false);
  adminNotesLoading      = signal(false);
  adminStatusLoading     = signal(false);
  adminDeleteLoading     = signal(false);
  adminEditError      = signal('');

  openAdminEdit(appt: Appointment, evt?: Event): void {
    evt?.stopPropagation();
    this.adminEditAppt.set(appt);
    this.adminEditDate.set(appt.date ?? '');
    this.adminEditSchedules.set([]);
    this.adminEditSlotId.set('');
    this.adminEditNotes.set(appt.notes ?? '');
    this.adminEditStatus.set(this.statusNameToValue(appt.status as unknown as string));
    this.adminEditError.set('');
    this.showAdminEditModal.set(true);
    if (appt.date) this.loadAdminEditSlots();
  }

  closeAdminEdit(): void {
    this.showAdminEditModal.set(false);
    this.adminEditAppt.set(null);
    this.adminEditError.set('');
  }

  onAdminEditDateChange(value: string): void {
    this.adminEditDate.set(value);
    this.adminEditSlotId.set('');
    this.loadAdminEditSlots();
  }

  loadAdminEditSlots(): void {
    const appt = this.adminEditAppt();
    const date = this.adminEditDate();
    if (!appt || !date) return;

    if (isPastDateTime(date, '23:59')) {
      this.adminEditSchedules.set([]);
      this.adminEditError.set('You cannot reschedule to a past date.');
      return;
    }

    this.adminSlotsLoading.set(true);
    this.adminEditError.set('');
    const doctorId = appt.doctor?.userId;
    if (!doctorId) {
      this.adminSlotsLoading.set(false);
      this.adminEditError.set('Appointment is missing its doctor record.');
      return;
    }
    this.appointmentService.getSchedules(doctorId, date).subscribe({
      next: slots => {
        this.adminSlotsLoading.set(false);
        this.adminEditSchedules.set(slots.filter(s => !isPastDateTime(s.date, s.timeSlot)));
      },
      error: err => {
        this.adminSlotsLoading.set(false);
        this.adminEditSchedules.set([]);
        const msg = err?.response?.data?.message ?? err?.message;
        this.adminEditError.set(typeof msg === 'string' ? msg : 'Failed to load slots.');
      }
    });
  }

  adminReschedule(): void {
    const appt = this.adminEditAppt();
    const slot = this.adminEditSchedules().find(s => s.scheduleID === this.adminEditSlotId());
    if (!appt) return;
    if (!slot) {
      this.adminEditError.set('Please pick a new time slot.');
      return;
    }

    if (isPastDateTime(slot.date, slot.timeSlot)) {
      this.adminEditError.set('You cannot reschedule to a past date or time.');
      return;
    }

    this.adminRescheduleLoading.set(true);
    this.adminEditError.set('');

    this.appointmentService.reschedule(appt.appointmentID, {
      newDate: slot.date,
      newTime: slot.timeSlot
    }).subscribe({
      next: () => {
        this.adminRescheduleLoading.set(false);
        this.success.set('Appointment rescheduled.');
        this.loadAppointments();
        this.closeAdminEdit();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.adminRescheduleLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to reschedule.';
        this.adminEditError.set(typeof msg === 'string' ? msg : 'Failed to reschedule.');
      }
    });
  }

  adminSaveNotes(): void {
    const appt = this.adminEditAppt();
    if (!appt) return;

    this.adminNotesLoading.set(true);
    this.adminEditError.set('');

    this.appointmentService.updateNotes(appt.appointmentID, this.adminEditNotes()).subscribe({
      next: () => {
        this.adminNotesLoading.set(false);
        this.success.set('Notes updated.');
        this.loadAppointments();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.adminNotesLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to update notes.';
        this.adminEditError.set(typeof msg === 'string' ? msg : 'Failed to update notes.');
      }
    });
  }

  adminSaveStatus(): void {
    const appt = this.adminEditAppt();
    if (!appt) return;

    this.adminStatusLoading.set(true);
    this.adminEditError.set('');

    this.appointmentService.updateStatus(appt.appointmentID, this.adminEditStatus()).subscribe({
      next: () => {
        this.adminStatusLoading.set(false);
        this.success.set('Status updated.');
        this.loadAppointments();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.adminStatusLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to update status.';
        this.adminEditError.set(typeof msg === 'string' ? msg : 'Failed to update status.');
      }
    });
  }

  adminDelete(id: string, evt?: Event): void {
    evt?.stopPropagation();
    if (!confirm('Permanently delete this appointment? This cannot be undone.')) return;

    this.adminDeleteLoading.set(true);
    this.appointmentService.deleteAppointment(id).subscribe({
      next: () => {
        this.adminDeleteLoading.set(false);
        this.success.set('Appointment deleted.');
        this.appointments.update(list => list.filter(a => a.appointmentID !== id));
        if (this.adminEditAppt()?.appointmentID === id) this.closeAdminEdit();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.adminDeleteLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to delete.';
        this.error.set(typeof msg === 'string' ? msg : 'Failed to delete.');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  // ── Appointment actions ────────────────────────────────────────────────────
  cancel(id: string): void {
    if (!confirm('Cancel this appointment?')) return;

    this.appointmentService.cancel(id).subscribe({
      next: () => {
        this.success.set('Appointment cancelled.');
        this.loadAppointments();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => this.error.set(err?.response?.data?.message ?? err?.message ?? 'Failed.')
    });
  }

  complete(id: string): void {
    this.appointmentService.complete(id).subscribe({
      next: () => {
        this.success.set('Appointment marked complete.');
        this.loadAppointments();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => this.error.set(err?.response?.data?.message ?? err?.message ?? 'Failed.')
    });
  }

  getStatusClass(status: AppointmentStatus): string {
    const map: Record<string, string> = {
      Pending:     'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
      Completed:   'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
      Cancelled:   'bg-red-500/15 text-red-400 ring-red-500/30',
      Rescheduled: 'bg-blue-500/15 text-blue-400 ring-blue-500/30'
    };
    return map[status] || 'bg-slate-700/50 text-slate-400 ring-slate-600/40';
  }

  doctorInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
