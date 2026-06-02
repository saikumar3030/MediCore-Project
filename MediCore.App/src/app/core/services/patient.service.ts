import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import axios from 'axios';

import { Patient, PatientDocument, DocType, DOC_TYPE_OPTIONS, CreatePatientRequest, UpdatePatientRequest } from '../models/patient.model';
import { environment } from '../../../environments/environment';

// JWT is attached globally by registerAxiosAuthInterceptor (see app.config.ts).
@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiUrl = `${environment.apiGatewayUrl}/api`;

  // Map backend GenderOption to frontend string enum.
  // Backend: Male=1, Female=2, Other=3 (PatientLibrary.Enums.GenderOption)
  private toGenderString(raw: any): string {
    if (raw === 1 || raw === '1') return 'Male';
    if (raw === 2 || raw === '2') return 'Female';
    if (raw === 3 || raw === '3') return 'Other';
    // Already a string value
    if (raw === 'Male' || raw === 'Female' || raw === 'Other') return raw;
    return 'Male';
  }

  // Normalize a raw item from the backend (handles PascalCase and camelCase)
  private normalizePatient(item: any): Patient {
    const rawGender = item.gender ?? item.Gender;
    const rawId     = item.patientID ?? item.PatientID;
    return {
      patientID:   rawId != null ? String(rawId) : '',
      name:        item.name        ?? item.Name         ?? '',
      email:       item.email       ?? item.Email        ?? '',
      dob:         item.dob         ?? item.DOB          ?? item.Dob         ?? '',
      gender:      this.toGenderString(rawGender) as any,
      address:     item.address     ?? item.Address      ?? '',
      phone:       item.phone       ?? item.Phone        ?? '',
      insuranceID: item.insuranceID != null
                     ? String(item.insuranceID)
                     : (item.InsuranceID != null ? String(item.InsuranceID) : undefined),
      status:      item.status      ?? item.Status       ?? false,
    } as Patient;
  }

  // Unwrap single-object response envelopes: { success, message, data: {...} }
  private extractSingle(responseData: any): any {
    if (responseData?.data && !Array.isArray(responseData.data)) return responseData.data;
    if (responseData?.value && !Array.isArray(responseData.value)) return responseData.value;
    if (responseData?.result && !Array.isArray(responseData.result)) return responseData.result;
    return responseData;
  }

  // Extract array from plain array or wrapped response shapes
  private extractList(responseData: any): any[] {
    if (Array.isArray(responseData))            return responseData;
    if (Array.isArray(responseData?.$values))   return responseData.$values;
    if (Array.isArray(responseData?.value))     return responseData.value;
    if (Array.isArray(responseData?.data))      return responseData.data;
    // Backend may wrap a single object in `data` — treat as a single-element list
    if (responseData?.data && typeof responseData.data === 'object') return [responseData.data];
    return [];
  }

  // Map backend docType (int code OR string name) to the DocType enum.
  // Backend: IDProof=1, Insurance=2, Aadhaar=3, Passport=4, Other=5.
  private toDocType(raw: any): DocType {
    if (raw == null) return DocType.Other;
    // String name straight match (incl. legacy "ID" → IDProof).
    if (typeof raw === 'string') {
      if (raw === 'ID') return DocType.IDProof;
      const byName = DOC_TYPE_OPTIONS.find(o => o.value === raw);
      if (byName) return byName.value;
      // Try numeric string
      const n = Number(raw);
      if (!Number.isNaN(n)) {
        const byCode = DOC_TYPE_OPTIONS.find(o => o.code === n);
        if (byCode) return byCode.value;
      }
    }
    if (typeof raw === 'number') {
      const byCode = DOC_TYPE_OPTIONS.find(o => o.code === raw);
      if (byCode) return byCode.value;
    }
    return DocType.Other;
  }

  private toDocTypeCode(type: DocType): number {
    return DOC_TYPE_OPTIONS.find(o => o.value === type)?.code ?? 5;
  }

  private normalizeDocument(item: any): PatientDocument {
    return {
      documentId: item.documentId ?? item.DocumentId ?? item.DocumentID ?? item.documentID ?? '',
      patientId:  item.patientId  ?? item.PatientId  ?? item.PatientID  ?? item.patientID  ?? '',
      fileUri:    item.fileUri    ?? item.FileUri    ?? item.FileURI    ?? item.fileURI    ?? '',
      fileName:   item.fileName   ?? item.FileName   ?? '',
      docType:    this.toDocType(item.docType ?? item.DocType),
      uploadedAt: item.uploadedAt ?? item.UploadedAt ?? item.uploadedDate ?? item.UploadedDate ?? '',
    };
  }

  create(request: CreatePatientRequest): Observable<Patient> {
    return from(axios.post(`${this.apiUrl}/Patient`, request))
      .pipe(map(r => this.normalizePatient(this.extractSingle(r.data))));
  }

  getAll(): Observable<Patient[]> {
    return from(axios.get(`${this.apiUrl}/Patient`)).pipe(
      map(r => this.extractList(r.data).map(item => this.normalizePatient(item)))
    );
  }

  getById(patientId: string): Observable<Patient> {
    return from(axios.get(`${this.apiUrl}/Patient/${patientId}`))
      .pipe(map(r => this.normalizePatient(this.extractSingle(r.data))));
  }

  update(patientId: string, request: UpdatePatientRequest): Observable<Patient> {
    // Backend GenderOption: Male=1, Female=2, Other=3
    const genderToInt: Record<string, number> = { Male: 1, Female: 2, Other: 3 };
    // Backend UpdatePatientDto requires PatientID in the body and non-nullable
    // DOB / Gender values, so we always include patientID and coerce gender
    // when present. Empty/undefined dob is dropped so the model binder can
    // surface a clear validation error instead of a 400 on bad date.
    const payload: any = {
      patientID: patientId,
      ...(request.dob ? { dob: request.dob } : {}),
      ...(request.gender != null ? { gender: genderToInt[request.gender] ?? 1 } : {}),
      ...(request.address != null ? { address: request.address } : {}),
      ...(request.phone != null ? { phone: request.phone } : {}),
      ...(request.insuranceID != null ? { insuranceID: request.insuranceID } : {})
    };
    return from(axios.put(`${this.apiUrl}/Patient/${patientId}`, payload))
      .pipe(
        map(r => this.normalizePatient(this.extractSingle(r.data)))
      );
  }

  delete(patientId: string): Observable<void> {
    return from(axios.delete(`${this.apiUrl}/Patient/${patientId}`))
      .pipe(map(() => undefined));
  }

  getDocuments(): Observable<PatientDocument[]> {
    return from(axios.get(`${this.apiUrl}/PatientDocument`)).pipe(
      map(r => this.extractList(r.data).map(item => this.normalizeDocument(item)))
    );
  }

  getDocumentById(documentId: string): Observable<PatientDocument> {
    return from(axios.get(`${this.apiUrl}/PatientDocument/${documentId}`)).pipe(
      map(r => this.normalizeDocument(this.extractSingle(r.data)))
    );
  }

  getDocumentsByPatientId(patientId: string): Observable<PatientDocument[]> {
    return from(axios.get(`${this.apiUrl}/PatientDocument/GetDocumentByPatientId/${patientId}`)).pipe(
      map(r => this.extractList(r.data).map(item => this.normalizeDocument(item)))
    );
  }

  deleteDocument(documentId: string): Observable<void> {
    return from(axios.delete(`${this.apiUrl}/PatientDocument/${documentId}`))
      .pipe(map(() => undefined));
  }

  // Uploads a single file (PDF or image) as a patient document. The backend
  // derives the patient ID from the JWT, so no patientId field is sent.
  // Do NOT set Content-Type manually — axios must set it itself so the
  // multipart boundary parameter is included; otherwise the API rejects with 415.
  uploadDocument(file: File, docType: DocType): Observable<PatientDocument> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('docType', String(this.toDocTypeCode(docType)));
    return from(axios.post(`${this.apiUrl}/PatientDocument`, form)).pipe(
      map(r => this.normalizeDocument(this.extractSingle(r.data)))
    );
  }
}
