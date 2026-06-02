import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import axios from 'axios';

import {
  Medicine, Dispense, IssuedPrescription,
  CreateMedicineRequest, UpdateStockRequest,
  UpdateMedicineStatusRequest, CreateDispenseRequest
} from '../models/pharmacy.model';
import { environment } from '../../../environments/environment';

// One method per backend endpoint. JWT is attached globally by
// registerAxiosAuthInterceptor (see app.config.ts).
@Injectable({ providedIn: 'root' })
export class PharmacyService {
  private readonly apiUrl = `${environment.apiGatewayUrl}/api/pharmacy`;

  // POST /api/pharmacy/medicines  — Doctor only
  createMedicine(request: CreateMedicineRequest): Observable<Medicine> {
    return from(axios.post<Medicine>(`${this.apiUrl}/medicines`, request))
      .pipe(map(r => r.data));
  }

  // GET /api/pharmacy/medicines  — Admin / Doctor / Pharmacist
  getMedicines(): Observable<Medicine[]> {
    return from(axios.get<Medicine[]>(`${this.apiUrl}/medicines`))
      .pipe(map(r => r.data));
  }

  // GET /api/pharmacy/medicines/{id}  — Admin / Doctor / Pharmacist
  getMedicineById(id: string): Observable<Medicine> {
    return from(axios.get<Medicine>(`${this.apiUrl}/medicines/${id}`))
      .pipe(map(r => r.data));
  }

  // PUT /api/pharmacy/medicines/{id}/stock  — Pharmacist only (additive)
  updateStock(id: string, request: UpdateStockRequest): Observable<Medicine> {
    return from(axios.put<Medicine>(`${this.apiUrl}/medicines/${id}/stock`, request))
      .pipe(map(r => r.data));
  }

  // PUT /api/pharmacy/medicines/{id}/status  — Admin only
  updateMedicineStatus(id: string, request: UpdateMedicineStatusRequest): Observable<Medicine> {
    return from(axios.put<Medicine>(`${this.apiUrl}/medicines/${id}/status`, request))
      .pipe(map(r => r.data));
  }

  // PUT /api/pharmacy/medicines/{id}/reactivate  — Pharmacist / Admin
  // Flips an Inactive medicine back to Active. Backend rejects past-expiry rows.
  reactivateMedicine(id: string): Observable<Medicine> {
    return from(axios.put<Medicine>(`${this.apiUrl}/medicines/${id}/reactivate`, {}))
      .pipe(map(r => r.data));
  }

  // DELETE /api/pharmacy/medicines/{id}  — Pharmacist only
  // Soft-remove: backend flips status to Inactive so Dispense FK references stay intact.
  removeMedicine(id: string): Observable<Medicine> {
    return from(axios.delete<Medicine>(`${this.apiUrl}/medicines/${id}`))
      .pipe(map(r => r.data));
  }

  // DELETE /api/pharmacy/medicines/{id}/permanent  — Pharmacist only
  // Hard delete: row removed from DB. Backend rejects with 400 if the medicine
  // isn't already Inactive, or with 409 if it has dispense history.
  hardDeleteMedicine(id: string): Observable<void> {
    return from(axios.delete(`${this.apiUrl}/medicines/${id}/permanent`))
      .pipe(map(() => undefined));
  }

  // POST /api/pharmacy/dispense  — Pharmacist only
  dispense(request: CreateDispenseRequest): Observable<Dispense> {
    return from(axios.post<Dispense>(`${this.apiUrl}/dispense`, request))
      .pipe(map(r => r.data));
  }

  // GET /api/pharmacy/dispense  — Admin / Pharmacist
  getDispenses(): Observable<Dispense[]> {
    return from(axios.get<Dispense[]>(`${this.apiUrl}/dispense`))
      .pipe(map(r => r.data));
  }

  // GET /api/pharmacy/dispense/{id}  — Admin / Pharmacist / Doctor
  getDispenseById(id: string): Observable<Dispense> {
    return from(axios.get<Dispense>(`${this.apiUrl}/dispense/${id}`))
      .pipe(map(r => r.data));
  }

  // GET /api/pharmacy/dispense/prescription/{prescriptionId}  — Admin / Pharmacist / Doctor
  getDispenseByPrescription(prescriptionId: string): Observable<Dispense> {
    return from(axios.get<Dispense>(`${this.apiUrl}/dispense/prescription/${prescriptionId}`))
      .pipe(map(r => r.data));
  }

  // GET /api/pharmacy/prescriptions/issued  — Admin / Pharmacist
  // Prescriptions still awaiting dispensing, with patient name resolved server-side.
  getIssuedPrescriptions(): Observable<IssuedPrescription[]> {
    return from(axios.get<IssuedPrescription[]>(`${this.apiUrl}/prescriptions/issued`))
      .pipe(map(r => r.data));
  }
}
