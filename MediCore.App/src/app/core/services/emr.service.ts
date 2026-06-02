import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EMR, Prescription,
  CreateEmrRequest, UpdateEmrRequest,
  CreatePrescriptionRequest
} from '../models/emr.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmrService {
  private readonly apiUrl = `${environment.apiGatewayUrl}/api/emr`;

  constructor(private http: HttpClient) {}

  create(request: CreateEmrRequest): Observable<EMR> {
    return this.http.post<EMR>(this.apiUrl, request);
  }

  getById(id: string): Observable<EMR> {
    return this.http.get<EMR>(`${this.apiUrl}/${id}`);
  }

  getByPatient(patientId: string): Observable<EMR[]> {
    return this.http.get<EMR[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  update(id: string, request: UpdateEmrRequest): Observable<EMR> {
    return this.http.put<EMR>(`${this.apiUrl}/${id}`, request);
  }

  addPrescription(emrId: string, request: CreatePrescriptionRequest): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.apiUrl}/${emrId}/prescriptions`, request);
  }

  getPrescriptions(emrId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.apiUrl}/${emrId}/prescriptions`);
  }
}
