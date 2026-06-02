import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { BillingService } from '../../core/services/billing.service';
import { AuthService } from '../../core/services/auth.service';
import { PatientService } from '../../core/services/patient.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { LabService } from '../../core/services/lab.service';
import { EmrService } from '../../core/services/emr.service';
import { Bill, Payment, PaymentMethod, CreateBillRequest } from '../../core/models/billing.model';
import { Patient } from '../../core/models/patient.model';
import { Appointment } from '../../core/models/appointment.model';
import { LabTest } from '../../core/models/lab.model';
import { EMR, Prescription } from '../../core/models/emr.model';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './billing.component.html'
})
export class BillingComponent implements OnInit {
  private billingService = inject(BillingService);
  private authService = inject(AuthService);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private labService = inject(LabService);
  private emrService = inject(EmrService);
  private fb = inject(FormBuilder);

  bills = signal<Bill[]>([]);
  selectedBill = signal<Bill | null>(null);
  selectedPatient = signal<Patient | null>(null);
  patientLoading = signal(false);
  payments = signal<Payment[]>([]);
  loading = signal(false);
  error = signal('');
  success = signal('');
  showBillForm = signal(false);
  showPaymentForm = signal(false);
  showClaimForm = signal(false);
  formLoading = signal(false);

  // New Bill workflow state. The Fees maps key by record ID; presence in the
  // map = the row is ticked, value = the fee typed in.
  allPatients      = signal<Patient[]>([]);
  allAppointments  = signal<Appointment[]>([]);
  allLabTests      = signal<LabTest[]>([]);
  newBillPatientId = signal<string>('');
  newBillEmrs      = signal<EMR[]>([]);
  newBillLoading   = signal(false);
  apptFees         = signal<Map<string, number>>(new Map<string, number>());
  labFees          = signal<Map<string, number>>(new Map<string, number>());
  rxFees           = signal<Map<string, number>>(new Map<string, number>());

  currentUser = this.authService.currentUser;
  isFinance = computed(() => this.authService.hasRole(UserRole.Finance_Officer));
  isAdmin = computed(() => this.authService.hasRole(UserRole.Admin));
  isPharmacist = computed(() => this.authService.hasRole(UserRole.Pharmacist));
  isPatient = computed(() => this.authService.hasRole(UserRole.Patient));
  // Any role that can author a bill.
  isBiller = computed(() => this.isFinance() || this.isAdmin() || this.isPharmacist());

  // Payment-method dropdown options (label → numeric value matching backend enum).
  readonly paymentMethods = Object.keys(PaymentMethod)
    .filter(k => isNaN(Number(k)))
    .map(k => ({ label: k, value: PaymentMethod[k as keyof typeof PaymentMethod] as number }));

  billForm = this.fb.group({
    patientID: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: ['', Validators.required]
  });

  paymentForm = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    method: [PaymentMethod.Cash, Validators.required]
  });

  claimForm = this.fb.group({
    insuranceID: ['', Validators.required],
    claimedAmount: [0, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    this.loadBills();
    if (this.isBiller()) {
      this.loadNewBillReferenceData();
    }
  }

  // One-shot fetch of patients/appts/labs so the New Bill form can filter locally.
  private loadNewBillReferenceData(): void {
    forkJoin({
      patients:     this.patientService.getAll()
        .pipe(catchError(err => { console.warn('[Billing] failed to load patients', err); return of<Patient[]>([]); })),
      appointments: this.appointmentService.getAll()
        .pipe(catchError(err => { console.warn('[Billing] failed to load appointments', err); return of<Appointment[]>([]); })),
      labs:         this.labService.getTests()
        .pipe(catchError(err => { console.warn('[Billing] failed to load lab tests', err); return of<LabTest[]>([]); }))
    }).subscribe(({ patients, appointments, labs }) => {
      this.allPatients.set(patients);
      this.allAppointments.set(appointments);
      this.allLabTests.set(labs);
    });
  }

  // Patient dropdown for New Bill. Hides patients whose EVERY bill is already
  // fully paid (nothing to do for them). Patients with no bills yet, or with
  // at least one outstanding bill, stay visible.
  eligiblePatients = computed(() => {
    const fullyPaidPatientIds = new Set<string>();
    const billsByPatient = new Map<string, Bill[]>();
    for (const b of this.bills()) {
      if (!b.patientID) continue;
      const list = billsByPatient.get(b.patientID) ?? [];
      list.push(b);
      billsByPatient.set(b.patientID, list);
    }
    for (const [pid, bs] of billsByPatient) {
      if (bs.length > 0 && bs.every(b => this.isBillFullyPaid(b))) {
        fullyPaidPatientIds.add(pid);
      }
    }
    return this.allPatients().filter(p => !fullyPaidPatientIds.has(p.patientID));
  });

  // All services for the selected patient. We show every row regardless of
  // status — the biller decides what to bill for by ticking checkboxes.
  newBillPatientAppointments = computed(() =>
    this.allAppointments().filter(a => a.patient?.userId === this.newBillPatientId())
  );
  newBillPatientLabs = computed(() =>
    this.allLabTests().filter(l => l.patient?.userId === this.newBillPatientId())
  );
  newBillPatientPrescriptions = computed<Prescription[]>(() =>
    this.newBillEmrs().flatMap(e => e.prescriptions ?? [])
  );

  // Live total — sum of every fee entered across the three categories.
  newBillTotal = computed(() => {
    const sum = (m: Map<string, number>) =>
      Array.from(m.values()).reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
    return sum(this.apptFees()) + sum(this.labFees()) + sum(this.rxFees());
  });

  newBillDescription = computed(() => {
    const parts: string[] = [];
    if (this.apptFees().size > 0) parts.push(`${this.apptFees().size} consultation${this.apptFees().size > 1 ? 's' : ''}`);
    if (this.labFees().size  > 0) parts.push(`${this.labFees().size} lab test${this.labFees().size  > 1 ? 's' : ''}`);
    if (this.rxFees().size   > 0) parts.push(`${this.rxFees().size} prescription${this.rxFees().size   > 1 ? 's' : ''}`);
    return parts.join(' + ') || 'Medical services';
  });

  openBillForm(): void {
    // Refresh data each time the form opens so newly-completed services show up.
    this.loadNewBillReferenceData();
    this.newBillPatientId.set('');
    this.newBillEmrs.set([]);
    this.resetFeeSelections();
    this.billForm.reset({ amount: 0 });
    this.showBillForm.set(true);
  }

  closeBillForm(): void {
    this.showBillForm.set(false);
  }

  onPatientSelected(patientId: string): void {
    this.newBillPatientId.set(patientId);
    this.resetFeeSelections();
    this.newBillEmrs.set([]);
    if (!patientId) return;
    this.newBillLoading.set(true);
    this.emrService.getByPatient(patientId).pipe(catchError(() => of<EMR[]>([]))).subscribe(emrs => {
      this.newBillEmrs.set(emrs);
      this.newBillLoading.set(false);
    });
  }

  private resetFeeSelections(): void {
    this.apptFees.set(new Map());
    this.labFees.set(new Map());
    this.rxFees.set(new Map());
  }

  // Selection + fee helpers. Toggling on adds the row at fee=0; toggling off
  // removes it from the total.
  isApptSelected(id: string): boolean { return this.apptFees().has(id); }
  isLabSelected(id: string):  boolean { return this.labFees().has(id);  }
  isRxSelected(id: string):   boolean { return this.rxFees().has(id);   }

  getApptFee(id: string): number { return this.apptFees().get(id) ?? 0; }
  getLabFee(id: string):  number { return this.labFees().get(id)  ?? 0; }
  getRxFee(id: string):   number { return this.rxFees().get(id)   ?? 0; }

  toggleApptSelection(id: string): void { this.toggleFeeMap(this.apptFees, id); }
  toggleLabSelection(id: string):  void { this.toggleFeeMap(this.labFees,  id); }
  toggleRxSelection(id: string):   void { this.toggleFeeMap(this.rxFees,   id); }

  setApptFee(id: string, fee: number): void { this.setFeeOn(this.apptFees, id, fee); }
  setLabFee(id: string, fee: number):  void { this.setFeeOn(this.labFees,  id, fee); }
  setRxFee(id: string, fee: number):   void { this.setFeeOn(this.rxFees,   id, fee); }

  private toggleFeeMap(sig: typeof this.apptFees, id: string): void {
    sig.update(m => {
      const next = new Map(m);
      if (next.has(id)) next.delete(id);
      else next.set(id, 0);
      return next;
    });
  }

  private setFeeOn(sig: typeof this.apptFees, id: string, fee: number): void {
    sig.update(m => {
      if (!m.has(id)) return m; // ignore edits on un-selected rows
      const next = new Map(m);
      next.set(id, Math.max(0, Number(fee) || 0));
      return next;
    });
  }

  loadBills(): void {
    this.loading.set(true);
    const user = this.currentUser();

    if (this.isPatient() && user) {
      this.billingService.getBillsByPatient(user.userId).subscribe({
        next: (b) => { this.bills.set(b); this.loading.set(false); },
        error: (err) => { this.error.set(err?.error?.message || 'Failed.'); this.loading.set(false); }
      });
    } else {
      this.billingService.getBills().subscribe({
        next: (b) => { this.bills.set(b); this.loading.set(false); },
        error: (err) => { this.error.set(err?.error?.message || 'Failed.'); this.loading.set(false); }
      });
    }
  }

  selectBill(bill: Bill): void {
    this.selectedBill.set(bill);
    this.showPaymentForm.set(false);
    this.showClaimForm.set(false);
    this.loadPayments(bill.billID);
    this.loadPatient(bill.patientID);
  }

  loadPatient(patientId: string): void {
    if (this.isPatient()) {
      this.selectedPatient.set(null);
      return;
    }
    this.selectedPatient.set(null);
    this.patientLoading.set(true);
    this.patientService.getById(patientId).subscribe({
      next: (p) => { this.selectedPatient.set(p); this.patientLoading.set(false); },
      error: () => { this.selectedPatient.set(null); this.patientLoading.set(false); }
    });
  }

  isBillFullyPaid(bill: Bill): boolean {
    return bill.paidAmount >= bill.amount;
  }

  loadPayments(billId: string): void {
    this.billingService.getPaymentsByBill(billId).subscribe({
      next: (p) => this.payments.set(p),
      error: () => this.payments.set([])
    });
  }

  createBill(): void {
    const patientId = this.newBillPatientId();
    const total     = this.newBillTotal();
    if (!patientId) { this.error.set('Pick a patient first.'); return; }
    if (total <= 0) { this.error.set('Tick at least one service to bill for.'); return; }

    this.formLoading.set(true);
    const payload: CreateBillRequest = {
      patientID: patientId,
      amount: total,
      description: this.newBillDescription()
    };
    this.billingService.createBill(payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.success.set('Bill created.');
        this.showBillForm.set(false);
        this.loadBills();
      },
      error: (err) => { this.formLoading.set(false); this.error.set(err?.error?.message || 'Failed.'); }
    });
  }

  makePayment(): void {
    const bill = this.selectedBill();
    if (!bill || this.paymentForm.invalid) return;
    this.formLoading.set(true);
    this.billingService.makePayment({
      billID: bill.billID,
      amount: this.paymentForm.get('amount')!.value!,
      method: Number(this.paymentForm.get('method')!.value!) as PaymentMethod
    }).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.success.set('Payment recorded.');
        this.showPaymentForm.set(false);
        this.paymentForm.reset({ amount: 0, method: PaymentMethod.Cash });
        this.loadBills();
        this.loadPayments(bill.billID);
      },
      error: (err) => { this.formLoading.set(false); this.error.set(err?.error?.message || 'Failed.'); }
    });
  }

  submitClaim(): void {
    const bill = this.selectedBill();
    if (!bill || this.claimForm.invalid) return;
    this.formLoading.set(true);
    this.billingService.createClaim({
      billID: bill.billID,
      insuranceID: this.claimForm.get('insuranceID')!.value!,
      claimedAmount: this.claimForm.get('claimedAmount')!.value!
    }).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.success.set('Insurance claim submitted.');
        this.showClaimForm.set(false);
        this.claimForm.reset({ claimedAmount: 0 });
      },
      error: (err) => { this.formLoading.set(false); this.error.set(err?.error?.message || 'Failed.'); }
    });
  }

  // Backend may return method as the enum name ("Cash") or its numeric value (1).
  // Always return the readable string label.
  getPaymentMethodLabel(method: PaymentMethod | number | string): string {
    if (typeof method === 'string' && isNaN(Number(method))) {
      // Already a label like "Cash" / "Card" / "UPI"
      return method;
    }
    const numeric = typeof method === 'string' ? Number(method) : method;
    return PaymentMethod[numeric as number] ?? String(method);
  }

  getBillStatusClass(status: string): string {
    const map: Record<string, string> = {
      Draft:     'bg-slate-700/50 text-slate-400 ring-slate-600/40',
      Issued:    'bg-blue-500/15 text-blue-400 ring-blue-500/30',
      Pending:   'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
      Paid:      'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
      Partial:   'bg-orange-500/15 text-orange-400 ring-orange-500/30',
      Overdue:   'bg-red-500/15 text-red-400 ring-red-500/30',
      Cancelled: 'bg-red-500/10 text-red-500 ring-red-500/20'
    };
    return map[status] || 'bg-slate-700/50 text-slate-400 ring-slate-600/40';
  }
}
