export enum EmrStatus {
  Active = 'Active',
  Archived = 'Archived',
  Closed = 'Closed'
}

export enum PrescriptionStatus {
  Active = 'Active',
  Dispensed = 'Dispensed',
  Cancelled = 'Cancelled'
}

export interface EmrUser {
  userId: string;
  userName: string;
  email: string;
  role: string;
  status: string;
}

export interface EMR {
  emrid: string;
  patient: EmrUser;
  doctor: EmrUser;
  diagnosis: string;
  treatmentPlan: string;
  status: EmrStatus;
  date: string;
  updatedAt?: string | null;
  prescriptions?: Prescription[];
}

export interface Prescription {
  prescriptionID: string;
  emrID: string;
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: PrescriptionStatus;
  createdAt: string;
}

export interface CreateEmrRequest {
  patientID: string;
  diagnosis: string;
  treatmentPlan: string;
}

export interface UpdateEmrRequest {
  diagnosis?: string;
  treatmentPlan?: string;
  status?: EmrStatus;
}

export interface CreatePrescriptionRequest {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
}
