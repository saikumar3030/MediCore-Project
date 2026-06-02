import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { PatientService } from '../../core/services/patient.service';
import { UserRole } from '../../core/models/user.model';
import { Patient, PatientDocument, Gender, UpdatePatientRequest, DocType, DOC_TYPE_OPTIONS } from '../../core/models/patient.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  private authService   = inject(AuthService);
  private userService   = inject(UserService);
  private patientService    = inject(PatientService);
  private fb            = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  isPatient   = computed(() => this.authService.hasRole(UserRole.Patient));

  loading = signal(false);
  success = signal('');
  error   = signal('');

  form = this.fb.group({
    userName: ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]]
  });

  // ── Patient-specific state ────────────────────────────────────────────────
  patientDetail  = signal<Patient | null>(null);
  patientDocs    = signal<PatientDocument[]>([]);
  patientLoading = signal(false);
  patientError   = signal('');
  editingProfile = signal(false);
  formLoading    = signal(false);

  readonly genders = Object.values(Gender);

  editForm = this.fb.group({
    dob:         ['', Validators.required],
    gender:      [Gender.Male, Validators.required],
    address:     ['', Validators.required],
    phone:       ['', Validators.required],
    insuranceID: ['']
  });

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      this.form.patchValue({ userName: user.userName, email: user.email });
    }

    if (this.isPatient()) {
      this.loadPatientData();
    }
  }

  loadPatientData(): void {
    const user = this.currentUser();
    if (!user) return;

    this.patientLoading.set(true);
    this.patientError.set('');

    forkJoin({
      profile: this.patientService.getById(user.userId).pipe(
        catchError(err => {
          const msg = err?.response?.data?.message ?? err?.response?.data?.title ?? err?.message ?? 'Failed to load profile.';
          this.patientError.set(msg);
          return of<Patient | null>(null);
        })
      ),
      docs: this.patientService.getDocumentsByPatientId(user.userId).pipe(
        catchError(() => of<PatientDocument[]>([]))
      )
    }).subscribe(({ profile, docs }) => {
      this.patientLoading.set(false);
      this.patientDetail.set(profile);
      this.patientDocs.set(docs);
    });
  }

  startPatientEdit(): void {
    const p = this.patientDetail();
    if (!p) return;
    this.editForm.patchValue({
      dob:         p.dob,
      gender:      p.gender,
      address:     p.address,
      phone:       p.phone,
      insuranceID: p.insuranceID ?? ''
    });
    this.editingProfile.set(true);
  }

  cancelPatientEdit(): void {
    this.editingProfile.set(false);
  }

  savePatientEdit(): void {
    const p = this.patientDetail();
    if (!p || this.editForm.invalid) return;

    this.formLoading.set(true);
    this.patientService.update(p.patientID, this.editForm.value as UpdatePatientRequest).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.editingProfile.set(false);
        this.success.set('Profile updated successfully.');
        this.loadPatientData();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.formLoading.set(false);
        this.error.set(err?.response?.data?.message ?? err?.message ?? 'Update failed.');
      }
    });
  }

  // ── Document upload state ────────────────────────────────────────────────
  readonly docTypeOptions = DOC_TYPE_OPTIONS;
  uploadType = signal<DocType>(DocType.IDProof);
  pendingFile = signal<File | null>(null);
  uploadLoading = signal(false);
  uploadError = signal('');

  docTypeLabel(type: string): string {
    const found = DOC_TYPE_OPTIONS.find(o => o.value === type);
    if (found) return found.label;
    // Legacy compatibility
    if (type === 'ID') return 'ID Card';
    if (type === 'MedicalHistory') return 'Medical History';
    return type;
  }

  docTypeColor(type: string): string {
    const map: Record<string, string> = {
      IDProof:        'bg-blue-50 text-blue-700 ring-blue-200',
      Insurance:      'bg-violet-50 text-violet-700 ring-violet-200',
      Aadhaar:        'bg-emerald-50 text-emerald-700 ring-emerald-200',
      Passport:       'bg-amber-50 text-amber-700 ring-amber-200',
      Other:          'bg-slate-100 text-slate-700 ring-slate-200',
      // Legacy
      ID:             'bg-blue-50 text-blue-700 ring-blue-200',
      MedicalHistory: 'bg-amber-50 text-amber-700 ring-amber-200',
    };
    return map[type] ?? map['Other'];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingFile.set(input.files?.[0] ?? null);
    this.uploadError.set('');
  }

  setUploadType(type: DocType): void {
    this.uploadType.set(type);
  }

  uploadDocument(): void {
    const file = this.pendingFile();
    if (!file) {
      this.uploadError.set('Please choose a file to upload.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError.set('File must be 10 MB or smaller.');
      return;
    }
    this.uploadLoading.set(true);
    this.uploadError.set('');
    this.patientService.uploadDocument(file, this.uploadType()).subscribe({
      next: () => {
        this.uploadLoading.set(false);
        this.pendingFile.set(null);
        this.success.set('Document uploaded successfully.');
        this.loadPatientData();
        // Reset the file input element
        const el = document.getElementById('patient-doc-file') as HTMLInputElement | null;
        if (el) el.value = '';
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.uploadLoading.set(false);
        this.uploadError.set(
          err?.response?.data?.message ?? err?.message ?? 'Upload failed.'
        );
      }
    });
  }

  removeDocument(documentId: string): void {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    this.patientService.deleteDocument(documentId).subscribe({
      next: () => {
        this.success.set('Document deleted.');
        this.loadPatientData();
        setTimeout(() => this.success.set(''), 2500);
      },
      error: err => {
        this.error.set(err?.response?.data?.message ?? 'Delete failed.');
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const user = this.currentUser();
    if (!user) return;

    this.loading.set(true);
    this.success.set('');
    this.error.set('');

    this.userService.update(user.userId, this.form.value as any).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Profile updated successfully.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Update failed.');
      }
    });
  }
}
