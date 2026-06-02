import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import axios from 'axios';

import {
  LabTest, LabReport,
  CreateLabTestRequest, AssignTechnicianRequest,
  UpdateTestStatusRequest, CreateLabReportRequest
} from '../models/lab.model';
import { environment } from '../../../environments/environment';

// JWT is attached globally by registerAxiosAuthInterceptor (see app.config.ts).
@Injectable({ providedIn: 'root' })
export class LabService {
  private readonly apiUrl = `${environment.apiGatewayUrl}/api/lab`;

  createTest(request: CreateLabTestRequest): Observable<LabTest> {
    return from(axios.post<LabTest>(`${this.apiUrl}/tests`, request))
      .pipe(map(r => r.data));
  }

  getTests(): Observable<LabTest[]> {
    return from(axios.get<LabTest[]>(`${this.apiUrl}/tests`))
      .pipe(map(r => r.data));
  }

  getTestById(id: string): Observable<LabTest> {
    return from(axios.get<LabTest>(`${this.apiUrl}/tests/${id}`))
      .pipe(map(r => r.data));
  }

  getTestsByPatient(patientId: string): Observable<LabTest[]> {
    return from(axios.get<LabTest[]>(`${this.apiUrl}/tests/patient/${patientId}`))
      .pipe(map(r => r.data));
  }

  getTestsByTechnician(technicianId: string): Observable<LabTest[]> {
    return from(axios.get<LabTest[]>(`${this.apiUrl}/tests/technician/${technicianId}`))
      .pipe(map(r => r.data));
  }

  assignTechnician(id: string, request: AssignTechnicianRequest): Observable<LabTest> {
    return from(axios.put<LabTest>(`${this.apiUrl}/tests/${id}/assign`, request))
      .pipe(map(r => r.data));
  }

  updateStatus(id: string, request: UpdateTestStatusRequest): Observable<LabTest> {
    return from(axios.put<LabTest>(`${this.apiUrl}/tests/${id}/status`, request))
      .pipe(map(r => r.data));
  }

  // Multipart upload: the axios interceptor skips Content-Type when data is FormData
  // so axios can set the multipart boundary itself.
  uploadReport(testId: string, request: CreateLabReportRequest): Observable<LabReport> {
    const formData = new FormData();
    formData.append('File', request.file);
    if (request.notes) formData.append('Notes', request.notes);

    return from(axios.post<LabReport>(`${this.apiUrl}/tests/${testId}/report`, formData))
      .pipe(map(r => r.data));
  }

  getReport(testId: string): Observable<LabReport> {
    return from(axios.get<LabReport>(`${this.apiUrl}/tests/${testId}/report`))
      .pipe(map(r => r.data));
  }

  // Returns the raw file alongside its server-provided filename, so the caller can
  // trigger a same-origin blob download that preserves the original extension.
  downloadReport(testId: string): Observable<{ blob: Blob; filename: string }> {
    return from(axios.get<Blob>(`${this.apiUrl}/tests/${testId}/report/download`, {
      responseType: 'blob'
    })).pipe(map(r => ({
      blob: r.data,
      filename: extractFilename(r.headers?.['content-disposition']) || `lab-report-${testId}`
    })));
  }
}

// Parses the filename from a Content-Disposition header. ASP.NET Core's FileResult
// emits both `filename="..."` and the RFC 5987 `filename*=UTF-8''...` form — we
// prefer the latter when present so non-ASCII names round-trip correctly.
function extractFilename(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try { return decodeURIComponent(star[1]); } catch { /* fall through */ }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : null;
}
