import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { PatientService } from '../../core/services/patient.service';
import { Patient, PatientDocument, Gender, UpdatePatientRequest, DOC_TYPE_OPTIONS } from '../../core/models/patient.model';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { UserRole, UserStatus, UpdateUserRequest } from '../../core/models/user.model';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patients.component.html'
})
export class PatientsComponent implements OnInit {
  private patientService = inject(PatientService);
  private userService    = inject(UserService);
  private authService    = inject(AuthService);
  private fb             = inject(FormBuilder);

  patients    = signal<Patient[]>([]);
  documents   = signal<PatientDocument[]>([]);
  loading     = signal(false);
  error       = signal('');
  success     = signal('');

  editingPatient = signal<Patient | null>(null);
  formLoading    = signal(false);

  // Which patient's documents are expanded
  expandedPatientId = signal<string | null>(null);

  isAdmin     = this.authService.hasRole(UserRole.Admin);
  currentUser = this.authService.currentUser;

  readonly genders   = Object.values(Gender);
  readonly statuses  = Object.values(UserStatus);

  editForm = this.fb.group({
    dob:         ['', Validators.required],
    gender:      [Gender.Male, Validators.required],
    address:     ['', Validators.required],
    phone:       ['', Validators.required],
    insuranceID: [''],
    status:      [UserStatus.Active, Validators.required]
  });

  ngOnInit(): void {
    this.loadPatients();
    this.loadDocuments();
  }

  loadPatients(): void {
    this.loading.set(true);

    if (this.isAdmin) {
      this.patientService.getAll().subscribe({
        next: patients => { 
          this.patients.set(patients); 
          this.loading.set(false); 
        },
        error: err => {
          this.error.set(err?.response?.data?.message ?? err?.message ?? 'Failed to load patients.');
          this.loading.set(false);
        }
      });
    } else {
      const user = this.currentUser();
      if (user) {
        this.patientService.getById(user.userId).subscribe({
          next: patient => { 
            this.patients.set([patient]); 
            this.loading.set(false); 
          },
          error: err => {
            this.error.set(err?.response?.data?.message ?? err?.message ?? 'Failed to load profile.');
            this.loading.set(false);
          }
        });
      }
    }
  }

  loadDocuments(): void {
    if (this.isAdmin) {
      this.patientService.getDocuments()
        .pipe(catchError(() => of<PatientDocument[]>([])))
        .subscribe(docs => this.documents.set(docs));
    } else {
      const user = this.currentUser();
      if (user) {
        this.patientService.getDocumentsByPatientId(user.userId)
          .pipe(catchError(() => of<PatientDocument[]>([])))
          .subscribe(docs => this.documents.set(docs));
      }
    }
  }

  // Returns documents belonging to a specific patient (filters cached signal)
  docsForPatient(patientId: string): PatientDocument[] {
    return this.documents().filter(d => d.patientId === patientId);
  }

  toggleDocs(patientId: string): void {
    this.expandedPatientId.set(
      this.expandedPatientId() === patientId ? null : patientId
    );
  }

  startEdit(patient: Patient): void {
    this.editingPatient.set(patient);
    this.editForm.patchValue({
      dob:         patient.dob,
      gender:      patient.gender,
      address:     patient.address,
      phone:       patient.phone,
      insuranceID: patient.insuranceID ?? '',
      status:      patient.status ? UserStatus.Active : UserStatus.Inactive
    });
  }

  cancelEdit(): void {
    this.editingPatient.set(null);
  }

  saveEdit(): void {
    const patient = this.editingPatient();
    if (!patient || this.editForm.invalid) return;

    const v = this.editForm.value;
    const desiredStatus = (v.status ?? UserStatus.Active) as UserStatus;

    this.formLoading.set(true);

    // Backend GenderOption: Male=1, Female=2, Other=3
    const genderToInt: Record<string, number> = { Male: 1, Female: 2, Other: 3 };

    if (this.isAdmin) {
      // Admins post the full UserUpdateDto so the backend handles both the
      // identity record (status flip) and the nested patient profile in one
      // transactional call. PatientID equals UserID, so we reuse it here.
      const payload: UpdateUserRequest = {
        userId:   patient.patientID,
        userName: patient.name || '',
        email:    patient.email || '',
        role:     UserRole.Patient,
        status:   desiredStatus,
        patientRequestDtos: {
          dob:         v.dob || '',
          gender:      genderToInt[v.gender ?? Gender.Male] ?? 1,
          address:     v.address || undefined,
          phone:       v.phone || undefined,
          insuranceID: v.insuranceID || undefined
        }
      };

      this.userService.update(patient.patientID, payload).subscribe({
        next: () => {
          this.formLoading.set(false);
          this.success.set(`Patient updated. Status set to ${desiredStatus}.`);
          this.editingPatient.set(null);
          this.loadPatients();
          setTimeout(() => this.success.set(''), 3000);
        },
        error: (err: any) => {
          this.formLoading.set(false);
          this.error.set(err?.response?.data?.message ?? err?.response?.data ?? err?.error?.message ?? err?.message ?? 'Update failed.');
        }
      });
      return;
    }

    // Non-admin (patient editing own profile): use the patient endpoint, which
    // takes the slim UpdatePatientDto and does not touch user identity.
    const profileRequest: UpdatePatientRequest = {
      dob:         v.dob ?? undefined,
      gender:      v.gender ?? undefined,
      address:     v.address ?? undefined,
      phone:       v.phone ?? undefined,
      insuranceID: v.insuranceID ?? undefined
    };

    this.patientService.update(patient.patientID, profileRequest).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.success.set('Patient updated successfully.');
        this.editingPatient.set(null);
        this.loadPatients();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err: any) => {
        this.formLoading.set(false);
        this.error.set(err?.response?.data?.message ?? err?.error?.message ?? err?.message ?? 'Update failed.');
      }
    });
  }

  deletePatient(patientId: string): void {
    if (!confirm('Delete this patient record?')) return;
    this.patientService.delete(patientId).subscribe({
      next: () => { this.success.set('Patient deleted.'); this.loadPatients(); setTimeout(() => this.success.set(''), 3000); },
      error: err => this.error.set(err?.response?.data?.message ?? err?.message ?? 'Delete failed.')
    });
  }

  deleteDocument(documentId: string): void {
    if (!confirm('Delete this document?')) return;
    this.patientService.deleteDocument(documentId).subscribe({
      next: () => { this.success.set('Document deleted.'); this.loadDocuments(); setTimeout(() => this.success.set(''), 3000); },
      error: err => this.error.set(err?.response?.data?.message ?? err?.message ?? 'Failed to delete document.')
    });
  }

  docTypeLabel(type: string): string {
    const found = DOC_TYPE_OPTIONS.find(o => o.value === type);
    if (found) return found.label;
    // Legacy values
    if (type === 'ID') return 'ID Card';
    if (type === 'MedicalHistory') return 'Medical History';
    return type;
  }

  patientInitials(patient: Patient): string {
    const source = (patient.name || patient.email || patient.patientID || '').trim();
    if (!source) return '??';
    const parts = source.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.substring(0, 2).toUpperCase();
  }
}
