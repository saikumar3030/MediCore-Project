import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import axios from 'axios';

import {
  Bill, Payment, InsuranceClaim,
  CreateBillRequest, UpdateBillStatusRequest,
  CreatePaymentRequest, CreateClaimRequest, UpdateClaimStatusRequest
} from '../models/billing.model';
import { environment } from '../../../environments/environment';

// JWT is attached globally by registerAxiosAuthInterceptor (see app.config.ts).
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly apiUrl = `${environment.apiGatewayUrl}/api/billing`;

  createBill(request: CreateBillRequest): Observable<Bill> {
    return from(axios.post<Bill>(`${this.apiUrl}/bills`, request))
      .pipe(map(r => r.data));
  }

  getBills(): Observable<Bill[]> {
    return from(axios.get<Bill[]>(`${this.apiUrl}/bills`))
      .pipe(map(r => r.data));
  }

  getBillById(id: string): Observable<Bill> {
    return from(axios.get<Bill>(`${this.apiUrl}/bills/${id}`))
      .pipe(map(r => r.data));
  }

  getBillsByPatient(patientId: string): Observable<Bill[]> {
    return from(axios.get<Bill[]>(`${this.apiUrl}/bills/patient/${patientId}`))
      .pipe(map(r => r.data));
  }

  updateBillStatus(id: string, request: UpdateBillStatusRequest): Observable<Bill> {
    return from(axios.put<Bill>(`${this.apiUrl}/bills/${id}/status`, request))
      .pipe(map(r => r.data));
  }

  makePayment(request: CreatePaymentRequest): Observable<Payment> {
    return from(axios.post<Payment>(`${this.apiUrl}/payments`, request))
      .pipe(map(r => r.data));
  }

  getPaymentById(id: string): Observable<Payment> {
    return from(axios.get<Payment>(`${this.apiUrl}/payments/${id}`))
      .pipe(map(r => r.data));
  }

  getPaymentsByBill(billId: string): Observable<Payment[]> {
    return from(axios.get<Payment[]>(`${this.apiUrl}/payments/bill/${billId}`))
      .pipe(map(r => r.data));
  }

  createClaim(request: CreateClaimRequest): Observable<InsuranceClaim> {
    return from(axios.post<InsuranceClaim>(`${this.apiUrl}/claims`, request))
      .pipe(map(r => r.data));
  }

  getClaimById(id: string): Observable<InsuranceClaim> {
    return from(axios.get<InsuranceClaim>(`${this.apiUrl}/claims/${id}`))
      .pipe(map(r => r.data));
  }

  updateClaimStatus(id: string, request: UpdateClaimStatusRequest): Observable<InsuranceClaim> {
    return from(axios.put<InsuranceClaim>(`${this.apiUrl}/claims/${id}/status`, request))
      .pipe(map(r => r.data));
  }
}
