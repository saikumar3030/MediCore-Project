import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LabService } from '../../core/services/lab.service';
import { AuthService } from '../../core/services/auth.service';
import { LabTest, LabReport, LabTestStatus, CreateLabReportRequest, labTestTypeLabel, labTestStatusLabel, normalizeLabTestStatus } from '../../core/models/lab.model';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lab.component.html'
})
export class LabComponent implements OnInit {
  private labService = inject(LabService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  tests = signal<LabTest[]>([]);
  selectedTest = signal<LabTest | null>(null);
  selectedReport = signal<LabReport | null>(null);
  loading = signal(false);
  error = signal('');
  success = signal('');
  showReportForm = signal(false);
  showAcceptForm = signal(false);
  formLoading = signal(false);
  confirmationPopUp = signal(false);

  currentUser = this.authService.currentUser;
  isDoctor = computed(() => this.authService.hasRole(UserRole.Doctor));
  isLabTech = computed(() => this.authService.hasRole(UserRole.Lab_Technician));
  isAdmin = computed(() => this.authService.hasRole(UserRole.Admin));
  isPatient = computed(() => this.authService.hasRole(UserRole.Patient));

  // Expose the enum so the template can compare against named members.
  readonly LabTestStatus = LabTestStatus;

  labTestTypeLabel = labTestTypeLabel;
  labTestStatusLabel = labTestStatusLabel;

  assignForm = this.fb.group({
    technicianID: ['', Validators.required]
  });

  reportForm = this.fb.group({
    notes: ['']
  });

  patientSearchId = signal('');

  ngOnInit(): void {
    this.loadTests();
  }

  loadTests(): void {
    this.loading.set(true);
    const user = this.currentUser();

    // Doctors arriving here from the patient overlay (?testId=…) get that test
    // pre-selected once the list has loaded. The list itself is fetched the same
    // way regardless of how we got here.
    const onLoaded = (t: LabTest[]) => {
      this.tests.set(t);
      this.loading.set(false);
      this.autoSelectFromQueryParam();
    };

    if (this.isPatient() && user) {
      this.labService.getTestsByPatient(user.userId).subscribe({
        next: onLoaded,
        error: (err) => { this.error.set(err?.error?.message || 'Failed.'); this.loading.set(false); }
      });
    }
    else if(this.isLabTech() && user){
      this.labService.getTestsByTechnician(user.userId).subscribe({
        next: onLoaded,
        error: (err)=>{ this.error.set(err?.error?.message || 'Failed.'); this.loading.set(false);}
      })
    }
    else {
      this.labService.getTests().subscribe({
        next: onLoaded,
        error: (err) => { this.error.set(err?.error?.message || 'Failed.'); this.loading.set(false); }
      });
    }
  }

  private autoSelectFromQueryParam(): void {
    const testId = this.route.snapshot.queryParamMap.get('testId');
    if (!testId) return;
    const match = this.tests().find(t => t.testID === testId);
    if (match) this.selectTest(match);
  }

  selectTest(test: LabTest): void {
    this.selectedTest.set(test);
    this.showReportForm.set(false);
    this.showAcceptForm.set(false);
    // The backend already includes the report on the test; fall back to a fetch only if it's missing.
    if (test.report) {
      this.selectedReport.set(test.report);
    } else {
      this.selectedReport.set(null);
      if (this.normalizeStatus(test.status) === LabTestStatus.Completed) {
        this.labService.getReport(test.testID).subscribe({
          next: (r) => this.selectedReport.set(r),
          error: () => this.selectedReport.set(null)
        });
      }
    }
  }

  loadReport(testId: string): void {
    this.labService.getReport(testId).subscribe({
      next: (r) => this.selectedReport.set(r),
      error: () => this.selectedReport.set(null)
    });
  }

  assignTechnician(): void {
    const test = this.selectedTest();
    if (!test || this.assignForm.invalid) return;
    this.formLoading.set(true);
    this.labService.assignTechnician(test.testID, { technicianID: this.assignForm.get('technicianID')!.value! }).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.success.set('Technician assigned.');
        this.showAcceptForm.set(false);
        this.loadTests();
      },
      error: (err) => { this.formLoading.set(false); this.error.set(err?.error?.message || 'Failed.'); }
    });
  }

  updateStatus(testId: string, status: LabTestStatus): void {
    this.labService.updateStatus(testId, {status}).subscribe({
      next: (updatedTest) => {
        this.success.set('Status updated.');
        // Patch the local list in place so the table cell reflects the new status.
        this.tests.update(list => list.map(t => t.testID === testId ? updatedTest : t));
        // The details panel binds to selectedTest(), which is a separate signal —
        // it has to be updated here too, otherwise it keeps showing the old status.
        const sel = this.selectedTest();
        if (sel && sel.testID === testId) {
          this.selectedTest.set(updatedTest);
        }
        this.confirmationPopUp.set(false);
      },
      error: (err) => this.error.set(err?.error?.message || 'Failed.')
    });
  }

  selectedFile: File | null = null;
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.selectedFile = file;
  }

  uploadReport(): void {
    const test = this.selectedTest();
    if (!test || !this.selectedFile || this.reportForm.invalid) return;

    this.formLoading.set(true);

    const reportData: CreateLabReportRequest = {
      file: this.selectedFile,
      notes: this.reportForm.get('notes')?.value || ''
    };

    this.labService.uploadReport(test.testID, reportData).subscribe({
      next: (report) => {
        this.formLoading.set(false);
        this.success.set('Report uploaded successfully.');
        this.showReportForm.set(false);
        this.reportForm.reset();
        this.selectedFile = null;
        this.selectedReport.set(report);
        this.selectedTest.set({ ...test, report });
        this.loadTests();
      },
      error: (err: any) => {
        this.formLoading.set(false);
        this.error.set(err?.response?.data?.message || err?.error?.message || 'Failed to upload report.');
      }
    });
  }

  getStatusClass(status: LabTestStatus | number | string): string {
    const map: Record<LabTestStatus, string> = {
      [LabTestStatus.Requested]:  'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
      [LabTestStatus.InProgress]: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
      [LabTestStatus.Completed]:  'bg-purple-500/15 text-purple-400 ring-purple-500/30',
      [LabTestStatus.Cancelled]:  'bg-red-500/15 text-red-400 ring-red-500/30'
    };
    const normalized = this.normalizeStatus(status);
    return map[normalized] || 'bg-slate-700/50 text-slate-400 ring-slate-600/40';
  }

  normalizeStatus(status: LabTestStatus | number | string): LabTestStatus {
    return normalizeLabTestStatus(status) ?? LabTestStatus.Requested;
  }

  hasReport(test: LabTest | null): boolean {
    return !!test?.report;
  }

  downloadingReport = signal(false);

  downloadReport(): void {
    const test = this.selectedTest();
    if (!test) return;
    this.downloadingReport.set(true);
    this.labService.downloadReport(test.testID).subscribe({
      next: ({ blob, filename }) => {
        this.downloadingReport.set(false);
        // Build a same-origin object URL and click a temporary <a> so the browser
        // honors the `download` attribute regardless of where the file is served from.
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
        this.downloadingReport.set(false);
        // With responseType: 'blob' axios returns error bodies as a Blob too —
        // decode it to JSON so the server's `message` actually surfaces.
        let message = err?.message || 'Failed to download report.';
        const body = err?.response?.data;
        if (body instanceof Blob) {
          try {
            const text = await body.text();
            const parsed = JSON.parse(text);
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
