export enum LabTestType {
  BloodTest = 1,
  Urine = 2,
  XRay = 3,
  MRI = 4,
  ECG = 5,
  Biopsy = 6
}

export const LAB_TEST_TYPE_OPTIONS: { value: LabTestType; label: string }[] = [
  { value: LabTestType.BloodTest, label: 'Blood Test' },
  { value: LabTestType.Urine,     label: 'Urine'      },
  { value: LabTestType.XRay,      label: 'X-Ray'      },
  { value: LabTestType.MRI,       label: 'MRI'        },
  { value: LabTestType.ECG,       label: 'ECG'        },
  { value: LabTestType.Biopsy,    label: 'Biopsy'     }
];

export function labTestTypeLabel(value: LabTestType | number | string | undefined | null): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    // Backend may send the enum *name* like "BloodTest" — resolve to its numeric value
    const fromName = (LabTestType as Record<string, any>)[value];
    if (typeof fromName === 'number') {
      return LAB_TEST_TYPE_OPTIONS.find(o => o.value === fromName)?.label ?? value;
    }
    const num = Number(value);
    if (!isNaN(num)) {
      return LAB_TEST_TYPE_OPTIONS.find(o => o.value === num)?.label ?? value;
    }
    return value;
  }

  return LAB_TEST_TYPE_OPTIONS.find(o => o.value === value)?.label ?? String(value);
}

export enum LabTestStatus {
  Requested = 1,
  InProgress,
  Completed,
  Cancelled
}

export const LAB_TEST_STATUS_LABELS: Record<LabTestStatus, string> = {
  [LabTestStatus.Requested]:  'Requested',
  [LabTestStatus.InProgress]: 'In Progress',
  [LabTestStatus.Completed]:  'Completed',
  [LabTestStatus.Cancelled]:  'Cancelled'
};

export function labTestStatusLabel(value: LabTestStatus | number | string | undefined | null): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return LAB_TEST_STATUS_LABELS[value as LabTestStatus] ?? String(value);
  }
  const normalized = value.replace(/\s+/g, '');
  const fromName = (LabTestStatus as Record<string, any>)[normalized];
  if (typeof fromName === 'number') {
    return LAB_TEST_STATUS_LABELS[fromName as LabTestStatus] ?? value;
  }
  const num = Number(value);
  if (!isNaN(num)) {
    return LAB_TEST_STATUS_LABELS[num as LabTestStatus] ?? value;
  }
  return value;
}

export function normalizeLabTestStatus(value: LabTestStatus | number | string | undefined | null): LabTestStatus | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value as LabTestStatus;
  const normalized = value.replace(/\s+/g, '');
  const fromName = (LabTestStatus as Record<string, any>)[normalized];
  if (typeof fromName === 'number') return fromName as LabTestStatus;
  const num = Number(value);
  return isNaN(num) ? null : (num as LabTestStatus);
}

export enum LabReportStatus {
  Pending = 1,
  Uploaded,
  Verified
}

export interface LabTestUser {
  userId: string;
  userName: string;
  email: string;
  role: string;
  status: string;
}

export interface LabTest {
  testID: string;
  // Backend enrichment can return null when the underlying user record was
  // soft-deleted or removed — templates must null-check before dereferencing.
  patient: LabTestUser | null;
  doctor: LabTestUser | null;
  technician: LabTestUser | null;
  type: LabTestType | string;
  status: LabTestStatus;
  date: string;
  updatedAt?: string | null;
  report?: LabReport | null;
}

export interface LabReport {
  reportID: string;
  testID: string;
  fileURI: string;
  fileName: string;
  notes?: string;
  status: LabReportStatus | string;
  date: string;
}

export interface CreateLabTestRequest {
  patientID: string;
  type: LabTestType;
  technicianID?: string;
}

export interface AssignTechnicianRequest {
  technicianID: string;
}

export interface UpdateTestStatusRequest {
  status: LabTestStatus;
}

export interface CreateLabReportRequest {
  file: File;
  notes?: string;
}
