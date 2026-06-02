export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

// Mirrors MediCore.Domain.Enums.DocTypeOption (string-converted in EF).
export enum DocType {
  IDProof = 'IDProof',
  Insurance = 'Insurance',
  Aadhaar = 'Aadhaar',
  Passport = 'Passport',
  Other = 'Other'
}

export const DOC_TYPE_OPTIONS: { value: DocType; label: string; code: number }[] = [
  { value: DocType.IDProof,   label: 'ID Card',   code: 1 },
  { value: DocType.Insurance, label: 'Insurance', code: 2 },
  { value: DocType.Aadhaar,   label: 'Aadhaar',   code: 3 },
  { value: DocType.Passport,  label: 'Passport',  code: 4 },
  { value: DocType.Other,     label: 'Other',     code: 5 },
];

export interface Patient {
  patientID: string;
  name:string;
  email:string;
  dob: string;
  gender: Gender;
  address: string;
  phone: string;
  insuranceID?: string;
  status: boolean;
}

export interface PatientDocument {
  documentId: string;
  patientId: string;
  fileUri: string;
  fileName: string;
  docType: DocType;
  uploadedAt: string;
}

export interface CreatePatientRequest {
  patientID: string;
  dob: string;
  gender: Gender;
  address: string;
  phone: string;
  insuranceID?: string;
}

export interface UpdatePatientRequest {
  dob?: string;
  gender?: Gender;
  address?: string;
  phone?: string;
  insuranceID?: string;
}
