import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmrService } from '../../core/services/emr.service';
import { AuthService } from '../../core/services/auth.service';
import { LabService } from '../../core/services/lab.service';
import { EMR, Prescription, CreateEmrRequest, CreatePrescriptionRequest } from '../../core/models/emr.model';
import { LabTest, LabTestStatus, labTestTypeLabel, labTestStatusLabel, normalizeLabTestStatus } from '../../core/models/lab.model';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-emr',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './emr.component.html'
})
export class EmrComponent implements OnInit {
  private emrService = inject(EmrService);
  private authService = inject(AuthService);
  private labService = inject(LabService);
  private fb = inject(FormBuilder);

  emrs = signal<EMR[]>([]);
  selectedEmr = signal<EMR | null>(null);
  prescriptions = signal<Prescription[]>([]);
  labTests = signal<LabTest[]>([]);

  readonly LabTestStatus = LabTestStatus;
  labTestTypeLabel = labTestTypeLabel;
  labTestStatusLabel = labTestStatusLabel;
  normalizeLabTestStatus = normalizeLabTestStatus;

  loading = signal(false);
  error = signal('');
  success = signal('');
  showCreateForm = signal(false);
  showRxForm = signal(false);
  formLoading = signal(false);
  // Tracks which lab report is currently being downloaded so the button can
  // show a spinner per row.
  downloadingReportTestId = signal<string | null>(null);

  currentUser = this.authService.currentUser;
  isDoctor = computed(() => this.authService.hasRole(UserRole.Doctor));
  isPatient = computed(() => this.authService.hasRole(UserRole.Patient));

  createForm = this.fb.group({
    patientID: ['', Validators.required],
    diagnosis: ['', Validators.required],
    treatmentPlan: ['', Validators.required]
  });

  rxForm = this.fb.group({
    medicine: ['', Validators.required],
    dosage: ['', Validators.required],
    frequency: ['', Validators.required],
    duration: ['', Validators.required]
  });

  patientSearchId = signal('');

  ngOnInit(): void {
    const user = this.currentUser();
    if (user && this.isPatient()) {
      this.loadEmrsByPatient(user.userId);
      this.loadLabTestsByPatient(user.userId);
    }
  }

  loadEmrsByPatient(patientId: string): void {
    this.loading.set(true);
    this.emrService.getByPatient(patientId).subscribe({
      next: (e) => { this.emrs.set(e); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.message || 'Failed to load records.'); this.loading.set(false); }
    });
  }

  loadLabTestsByPatient(patientId: string): void {
    this.labService.getTestsByPatient(patientId).subscribe({
      next: (t) => this.labTests.set(t ?? []),
      error: () => this.labTests.set([])
    });
  }

  getLabStatusClass(status: LabTestStatus | number | string): string {
    const map: Record<LabTestStatus, string> = {
      [LabTestStatus.Requested]:  'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
      [LabTestStatus.InProgress]: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
      [LabTestStatus.Completed]:  'bg-purple-500/15 text-purple-400 ring-purple-500/30',
      [LabTestStatus.Cancelled]:  'bg-red-500/15 text-red-400 ring-red-500/30'
    };
    const normalized = normalizeLabTestStatus(status) ?? LabTestStatus.Requested;
    return map[normalized] || 'bg-slate-700/50 text-slate-400 ring-slate-600/40';
  }

  searchByPatient(): void {
    const id = this.patientSearchId();
    if (!id) return;
    this.loadEmrsByPatient(id);
  }

  selectEmr(emr: EMR): void {
    this.selectedEmr.set(emr);
    this.showRxForm.set(false);

    this.prescriptions.set(emr.prescriptions ?? []);

    this.loadPrescriptions(emr.emrid);
  }

  loadPrescriptions(emrId: string): void {
    this.emrService.getPrescriptions(emrId).subscribe({
      next: (p) => this.prescriptions.set(p ?? []),
      error: () => { /* keep inline prescriptions seeded from selectEmr */ }
    });
  }

  createEmr(): void {
    if (this.createForm.invalid) return;
    this.formLoading.set(true);
    this.emrService.create(this.createForm.value as CreateEmrRequest).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.success.set('EMR created.');
        this.showCreateForm.set(false);
        this.createForm.reset();
        const pid = this.createForm.get('patientID')?.value;
        if (pid) this.loadEmrsByPatient(pid);
      },
      error: (err) => { this.formLoading.set(false); this.error.set(err?.error?.message || 'Failed.'); }
    });
  }

  addPrescription(): void {
    const emr = this.selectedEmr();
    if (!emr || this.rxForm.invalid) return;
    this.formLoading.set(true);
    this.emrService.addPrescription(emr.emrid, this.rxForm.value as CreatePrescriptionRequest).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.success.set('Prescription added.');
        this.showRxForm.set(false);
        this.rxForm.reset();
        this.loadPrescriptions(emr.emrid);
      },
      error: (err) => { this.formLoading.set(false); this.error.set(err?.error?.message || 'Failed.'); }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      Active:   'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
      Archived: 'bg-slate-700/50 text-slate-400 ring-slate-600/40',
      Closed:   'bg-red-500/15 text-red-400 ring-red-500/30'
    };
    return map[status] || 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30';
  }

  getRxStatusClass(status: string): string {
    const map: Record<string, string> = {
      Active:    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
      Dispensed: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30',
      Cancelled: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30'
    };
    return map[status] || 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30';
  }

  // Streams the lab report PDF through the authenticated backend endpoint and
  // triggers a same-origin object-URL download so the file keeps its original
  // name and Content-Type.
  downloadReport(testId: string): void {
    if (!testId) return;
    this.downloadingReportTestId.set(testId);
    this.labService.downloadReport(testId).subscribe({
      next: ({ blob, filename }) => {
        this.downloadingReportTestId.set(null);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: async (err: any) => {
        this.downloadingReportTestId.set(null);
        let message = err?.message || 'Failed to download report.';
        const body = err?.response?.data;
        if (body instanceof Blob) {
          try {
            const parsed = JSON.parse(await body.text());
            if (parsed?.message) message = parsed.message;
          } catch { /* not JSON, keep default */ }
        } else if (typeof body?.message === 'string') {
          message = body.message;
        }
        this.error.set(message);
      }
    });
  }
}
