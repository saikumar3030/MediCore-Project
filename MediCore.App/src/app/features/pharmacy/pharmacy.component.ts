import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PharmacyService } from '../../core/services/pharmacy.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Medicine, Dispense, IssuedPrescription,
  MedicineType, MedicineStatus,
  CreateMedicineRequest, CreateDispenseRequest
} from '../../core/models/pharmacy.model';
import { UserRole } from '../../core/models/user.model';

// Three roles share this screen:
//   - Doctor      → add new medicines
//   - Pharmacist  → adjust stock, dispense, remove, reactivate
//   - Admin       → change a medicine's status freely
@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pharmacy.component.html'
})
export class PharmacyComponent implements OnInit {
  private pharmacyService = inject(PharmacyService);
  private authService     = inject(AuthService);
  private fb              = inject(FormBuilder);

  isPharmacist = computed(() => this.authService.hasRole(UserRole.Pharmacist));
  isDoctor     = computed(() => this.authService.hasRole(UserRole.Doctor));
  isAdmin      = computed(() => this.authService.hasRole(UserRole.Admin));

  medicines = signal<Medicine[]>([]);
  dispenses = signal<Dispense[]>([]);
  issuedPrescriptions = signal<IssuedPrescription[]>([]);

  loading          = signal(false);
  dispensesLoading = signal(false);
  issuedLoading    = signal(false);
  error            = signal('');
  success          = signal('');

  activeTab         = signal<'medicines' | 'dispenses'>('medicines');
  selectedPatientID = signal<string>('');

  // "string | null" holds the medicine ID of the row being edited inline.
  showMedForm      = signal(false);
  showDispenseForm = signal(false);
  showLookupForm   = signal(false);
  showStockForm    = signal<string | null>(null);
  showStatusForm   = signal<string | null>(null);
  formLoading      = signal(false);

  // Confirmation modal target for pharmacist Remove (soft-delete → Inactive).
  removeTarget  = signal<Medicine | null>(null);
  removeLoading = signal(false);

  medicineSearch       = signal('');
  medicineStatusFilter = signal<'All' | 'Active' | 'Inactive' | 'OutOfStock' | 'Expired'>('All');
  dispenseSearch       = signal('');

  // Prescription lookup result
  lookupResult    = signal<Dispense | null>(null);
  lookupError     = signal('');
  lookupLoading   = signal(false);

  // ── Dropdown options (label → numeric value mirrors backend enums) ────────
  readonly medicineTypeOptions: { label: string; value: number }[] = [
    { label: 'Tablet',    value: MedicineType.Tablet    },
    { label: 'Capsule',   value: MedicineType.Capsule   },
    { label: 'Syrup',     value: MedicineType.Syrup     },
    { label: 'Injection', value: MedicineType.Injection },
    { label: 'Cream',     value: MedicineType.Cream     },
    { label: 'Drops',     value: MedicineType.Drops     },
  ];

  readonly medicineStatusOptions: { label: string; value: number }[] = [
    { label: 'Active',      value: MedicineStatus.Active     },
    { label: 'Inactive',    value: MedicineStatus.Inactive   },
    { label: 'OutOfStock',  value: MedicineStatus.OutOfStock },
    { label: 'Expired',     value: MedicineStatus.Expired    },
  ];

  addMedicineForm = this.fb.group({
    name:       ['', Validators.required],
    type:       [MedicineType.Tablet, Validators.required],
    stock:      [0, [Validators.required, Validators.min(0)]],
    expiryDate: ['', Validators.required]
  });

  // patientID is UI-only — used to filter the prescription dropdown, not sent to backend.
  dispenseForm = this.fb.group({
    patientID:      [''],
    prescriptionID: ['', Validators.required],
    medicineID:     ['', Validators.required],
    quantity:       [1, [Validators.required, Validators.min(1)]]
  });

  stockForm = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  statusForm = this.fb.group({
    status: [MedicineStatus.Active, Validators.required]
  });

  lookupForm = this.fb.group({
    prescriptionID: ['', Validators.required]
  });

  // Expired medicines are treated as inactive, so they're excluded from
  // Active / OutOfStock / LowStock counts even if their stored status says otherwise.
  totalMedicines      = computed(() => this.medicines().length);
  activeMedicines     = computed(() => this.medicines().filter(m => m.status === 'Active' && !this.isExpired(m.expiryDate) && m.stock > 0).length);
  outOfStockMedicines = computed(() => this.medicines().filter(m => !this.isExpired(m.expiryDate) && m.status !== 'Inactive' && (m.status === 'OutOfStock' || m.stock === 0)).length);
  expiredMedicines    = computed(() => this.medicines().filter(m => m.status === 'Expired' || this.isExpired(m.expiryDate)).length);
  lowStockMedicines   = computed(() => this.medicines().filter(m => m.stock > 0 && m.stock < 10 && !this.isExpired(m.expiryDate)).length);
  totalDispenses      = computed(() => this.dispenses().length);

  filteredMedicines = computed(() => {
    const q = this.medicineSearch().toLowerCase().trim();
    const status = this.medicineStatusFilter();
    return this.medicines()
      .filter(m => {
        if (status === 'All') return true;
        const expired = this.isExpired(m.expiryDate);
        // Expired medicines are auto-treated as Inactive, so they show in both
        // the Inactive and Expired filters, and are excluded from Active/OutOfStock.
        if (status === 'Inactive')   return m.status === 'Inactive' || expired;
        if (status === 'Expired')    return m.status === 'Expired'  || expired;
        if (expired) return false;
        // Stock-0 medicines auto-show under OutOfStock (unless they're already Inactive).
        if (status === 'OutOfStock') return m.status !== 'Inactive' && (m.status === 'OutOfStock' || m.stock === 0);
        if (status === 'Active')     return m.status === 'Active'   && m.stock > 0;
        return m.status === status;
      })
      .filter(m => !q ? true : m.name.toLowerCase().includes(q) || (m.type ?? '').toLowerCase().includes(q));
  });

  filteredDispenses = computed(() => {
    const q = this.dispenseSearch().toLowerCase().trim();
    if (!q) return this.dispenses();
    return this.dispenses().filter(d =>
      (d.prescriptionID ?? '').toLowerCase().includes(q)
      || (d.medicineName ?? '').toLowerCase().includes(q)
      || (d.pharmacistID ?? '').toLowerCase().includes(q)
    );
  });

  // Medicines that the pharmacist can dispense (Active and in stock)
  dispensableMedicines = computed(() =>
    this.medicines().filter(m => m.status === 'Active' && m.stock > 0 && !this.isExpired(m.expiryDate))
  );

  // Distinct patients pulled from the Issued prescription queue.
  issuedPatients = computed(() => {
    const seen = new Set<string>();
    const list: { patientID: string; patientName: string }[] = [];
    for (const p of this.issuedPrescriptions()) {
      if (p.patientID && !seen.has(p.patientID)) {
        seen.add(p.patientID);
        list.push({ patientID: p.patientID, patientName: p.patientName || p.patientID });
      }
    }
    return list.sort((a, b) => a.patientName.localeCompare(b.patientName));
  });

  // Prescriptions belonging to whichever patient is currently selected.
  prescriptionsForSelectedPatient = computed(() => {
    const pid = this.selectedPatientID();
    if (!pid) return [];
    return this.issuedPrescriptions().filter(p => p.patientID === pid);
  });

  ngOnInit(): void {
    this.loadMedicines();
    if (this.canSeeDispenses()) this.loadDispenses();
  }

  canSeeDispenses(): boolean {
    return this.isPharmacist() || this.isAdmin();
  }

  loadMedicines(): void {
    this.loading.set(true);
    this.pharmacyService.getMedicines().subscribe({
      next: m => { this.medicines.set(m); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toastError(err, 'Failed to load medicines.'); }
    });
  }

  loadDispenses(): void {
    this.dispensesLoading.set(true);
    this.pharmacyService.getDispenses().subscribe({
      next: d => { this.dispenses.set(d); this.dispensesLoading.set(false); },
      error: err => { this.dispensesLoading.set(false); this.toastError(err, 'Failed to load dispenses.'); }
    });
  }

  loadIssuedPrescriptions(): void {
    if (!this.isPharmacist() && !this.isAdmin()) return;
    this.issuedLoading.set(true);
    this.pharmacyService.getIssuedPrescriptions().subscribe({
      next: p => { this.issuedPrescriptions.set(p); this.issuedLoading.set(false); },
      error: err => { this.issuedLoading.set(false); this.toastError(err, 'Failed to load prescriptions.'); }
    });
  }

  // Toggles the dispense form open/closed; refreshes the Issued queue on open
  // so the pharmacist always sees up-to-date prescriptions from doctors.
  toggleDispenseForm(): void {
    const next = !this.showDispenseForm();
    this.showDispenseForm.set(next);
    if (next) {
      this.dispenseForm.reset({ patientID: '', prescriptionID: '', medicineID: '', quantity: 1 });
      this.selectedPatientID.set('');
      this.loadIssuedPrescriptions();
    }
  }

  onPatientChange(patientId: string): void {
    this.selectedPatientID.set(patientId);
    this.dispenseForm.patchValue({ patientID: patientId, prescriptionID: '', medicineID: '' });
  }

  // When a prescription is picked, latch its ID into the form and try to
  // auto-select a matching inventory medicine by name (case-insensitive).
  // Pharmacist can still override if the auto-match is wrong.
  onPrescriptionChange(prescriptionId: string): void {
    this.dispenseForm.patchValue({ prescriptionID: prescriptionId, medicineID: '' });
    const presc = this.issuedPrescriptions().find(p => p.prescriptionID === prescriptionId);
    if (!presc?.medicine) return;
    const needle = presc.medicine.toLowerCase().trim();
    const match = this.dispensableMedicines().find(m => {
      const name = m.name.toLowerCase();
      return name === needle || name.includes(needle) || needle.includes(name);
    });
    if (match) this.dispenseForm.patchValue({ medicineID: match.medicineID });
  }

  switchTab(tab: 'medicines' | 'dispenses'): void {
    this.activeTab.set(tab);
    if (tab === 'dispenses' && this.dispenses().length === 0 && this.canSeeDispenses()) {
      this.loadDispenses();
    }
  }

  // ── Doctor: add new medicine ───────────────────────────────────────────────
  createMedicine(): void {
    if (this.addMedicineForm.invalid) return;
    this.formLoading.set(true);

    const v = this.addMedicineForm.value;
    const req: CreateMedicineRequest = {
      name:       v.name!,
      type:       Number(v.type) as MedicineType,
      stock:      Number(v.stock) || 0,
      expiryDate: v.expiryDate!
    };

    this.pharmacyService.createMedicine(req).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.toastSuccess('Medicine added.');
        this.showMedForm.set(false);
        this.addMedicineForm.reset({ type: MedicineType.Tablet, stock: 0 });
        this.loadMedicines();
      },
      error: err => { this.formLoading.set(false); this.toastError(err, 'Failed to add medicine.'); }
    });
  }

  // ── Pharmacist: add stock (additive) ───────────────────────────────────────
  openStockForm(med: Medicine): void {
    this.showStockForm.set(med.medicineID);
    this.stockForm.reset({ quantity: 1 });
  }

  saveStock(medicineId: string): void {
    if (this.stockForm.invalid) return;
    this.formLoading.set(true);
    const qty = Number(this.stockForm.get('quantity')!.value);

    this.pharmacyService.updateStock(medicineId, { quantity: qty }).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.toastSuccess(`Added ${qty} unit(s) to stock.`);
        this.showStockForm.set(null);
        this.loadMedicines();
      },
      error: err => { this.formLoading.set(false); this.toastError(err, 'Failed to update stock.'); }
    });
  }

  // ── Admin: change medicine status ──────────────────────────────────────────
  openStatusForm(med: Medicine): void {
    this.showStatusForm.set(med.medicineID);
    const current = this.medicineStatusOptions.find(o => o.label === med.status)?.value ?? MedicineStatus.Active;
    this.statusForm.reset({ status: current });
  }

  saveStatus(medicineId: string): void {
    if (this.statusForm.invalid) return;
    this.formLoading.set(true);
    const status = Number(this.statusForm.get('status')!.value) as MedicineStatus;

    this.pharmacyService.updateMedicineStatus(medicineId, { status }).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.toastSuccess('Status updated.');
        this.showStatusForm.set(null);
        this.loadMedicines();
      },
      error: err => { this.formLoading.set(false); this.toastError(err, 'Failed to update status.'); }
    });
  }

  // ── Reactivate an Inactive medicine ───────────────────────────────────────
  // Only valid for rows whose stored status is Inactive AND that aren't past
  // their expiry date — date-expired rows are auto-shown as Inactive but cannot
  // be brought back to Active.
  reactivateMedicine(med: Medicine): void {
    if (this.isExpired(med.expiryDate)) {
      this.toastError(null, 'Cannot reactivate an expired medicine.');
      return;
    }
    this.formLoading.set(true);
    this.pharmacyService.reactivateMedicine(med.medicineID).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.toastSuccess(`"${med.name}" reactivated.`);
        this.loadMedicines();
      },
      error: err => { this.formLoading.set(false); this.toastError(err, 'Failed to reactivate medicine.'); }
    });
  }

  // ── Pharmacist: remove medicine ───────────────────────────────────────────
  // Two-step removal:
  //   1. Active/Expired/OutOfStock row → soft-delete (status flips to Inactive)
  //   2. Already-Inactive row          → hard-delete (row permanently removed)
  // Routing decision lives on the row's current status, not the active filter,
  // so the confirm modal stays correct even if the user changes filters mid-flow.
  openRemoveConfirm(med: Medicine): void {
    this.removeTarget.set(med);
  }

  closeRemoveConfirm(): void {
    if (this.removeLoading()) return;
    this.removeTarget.set(null);
  }

  isHardDeleteTarget(): boolean {
    return this.removeTarget()?.status === 'Inactive';
  }

  confirmRemoveMedicine(): void {
    const target = this.removeTarget();
    if (!target) return;
    this.removeLoading.set(true);

    const onSuccess = (msg: string) => () => {
      this.removeLoading.set(false);
      this.removeTarget.set(null);
      this.toastSuccess(msg);
      this.loadMedicines();
    };
    const onError = (fallback: string) => (err: unknown) => {
      this.removeLoading.set(false);
      this.toastError(err, fallback);
    };

    if (target.status === 'Inactive') {
      this.pharmacyService.hardDeleteMedicine(target.medicineID).subscribe({
        next: onSuccess(`"${target.name}" permanently deleted.`),
        error: onError('Failed to permanently delete medicine.')
      });
    } else {
      this.pharmacyService.removeMedicine(target.medicineID).subscribe({
        next: onSuccess(`"${target.name}" removed from inventory.`),
        error: onError('Failed to remove medicine.')
      });
    }
  }

  // ── Pharmacist: dispense medicine ──────────────────────────────────────────
  createDispense(): void {
    if (this.dispenseForm.invalid) return;
    this.formLoading.set(true);

    const v = this.dispenseForm.value;
    const req: CreateDispenseRequest = {
      prescriptionID: v.prescriptionID!,
      medicineID:     v.medicineID!,
      quantity:       Number(v.quantity) || 1
    };

    this.pharmacyService.dispense(req).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.toastSuccess('Medicine dispensed.');
        this.showDispenseForm.set(false);
        this.dispenseForm.reset({ patientID: '', prescriptionID: '', medicineID: '', quantity: 1 });
        this.selectedPatientID.set('');
        this.loadMedicines();
        this.loadDispenses();
        this.loadIssuedPrescriptions();
      },
      error: err => { this.formLoading.set(false); this.toastError(err, 'Failed to dispense.'); }
    });
  }

  // ── Lookup dispense by prescription ID ─────────────────────────────────────
  lookupDispense(): void {
    if (this.lookupForm.invalid) return;
    const presId = this.lookupForm.get('prescriptionID')!.value!.trim();
    if (!presId) return;

    this.lookupLoading.set(true);
    this.lookupResult.set(null);
    this.lookupError.set('');

    this.pharmacyService.getDispenseByPrescription(presId).subscribe({
      next: d => { this.lookupLoading.set(false); this.lookupResult.set(d); },
      error: err => {
        this.lookupLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.message ?? 'No dispense found for that prescription.';
        this.lookupError.set(typeof msg === 'string' ? msg : 'Lookup failed.');
      }
    });
  }

  private toastSuccess(message: string): void {
    this.success.set(message);
    this.error.set('');
    setTimeout(() => this.success.set(''), 3000);
  }

  // Prefers the backend's error message; falls back to a generic one.
  private toastError(err: any, fallback: string): void {
    const msg = err?.response?.data?.message ?? err?.message ?? fallback;
    this.error.set(typeof msg === 'string' ? msg : fallback);
    setTimeout(() => this.error.set(''), 4000);
  }

  dismissToast(): void { this.success.set(''); this.error.set(''); }

  // What status to DISPLAY (may differ from the stored status):
  //   expired       → Inactive
  //   stock = 0     → OutOfStock (unless already Inactive)
  //   otherwise     → as stored
  effectiveStatus(med: Medicine): string {
    if (this.isExpired(med.expiryDate)) return 'Inactive';
    if (med.stock === 0 && med.status !== 'Inactive') return 'OutOfStock';
    return med.status;
  }

  isExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    return !isNaN(expiry.getTime()) && expiry.getTime() < Date.now();
  }

  daysUntilExpiry(expiryDate: string): number | null {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return null;
    const oneDayInMs = 1000 * 60 * 60 * 24;
    return Math.ceil((expiry.getTime() - Date.now()) / oneDayInMs);
  }

  // Returns the Tailwind colour classes for the "Stock" badge:
  // red = empty, yellow = below 10 units (low), green = healthy.
  getStockBadgeClass(med: Medicine): string {
    if (med.stock === 0) return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30';
    if (med.stock < 10)  return 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30';
    return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30';
  }

  // Returns the Tailwind colour classes for the medicine "Status" badge,
  // keyed by the visible status text (Active, Inactive, OutOfStock, Expired).
  getMedicineStatusClass(status: string): string {
    const map: Record<string, string> = {
      Active:     'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
      Inactive:   'bg-slate-500/15 text-slate-400 ring-slate-500/30',
      OutOfStock: 'bg-red-500/15 text-red-400 ring-red-500/30',
      Expired:    'bg-orange-500/15 text-orange-400 ring-orange-500/30',
    };
    return map[status] || 'bg-slate-700/50 text-slate-400 ring-slate-600/40';
  }

  getDispenseStatusClass(status: string): string {
    const map: Record<string, string> = {
      Pending:   'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
      Dispensed: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
      Cancelled: 'bg-red-500/15 text-red-400 ring-red-500/30',
    };
    return map[status] || 'bg-slate-700/50 text-slate-400 ring-slate-600/40';
  }
}
