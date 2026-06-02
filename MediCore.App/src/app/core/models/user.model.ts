export enum UserRole {
  Admin = 'Admin',
  Patient = 'Patient',
  Doctor = 'Doctor',
  Pharmacist = 'Pharmacist',
  Lab_Technician = 'Lab_Technician',
  Finance_Officer = 'Finance_Officer'
}

export enum UserStatus {
  Active = 'Active',
  Inactive = 'Inactive'
}

export interface User {
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  loginAt: string;
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
}

export interface PatientProfile {
  dob: string;         // ISO date: "YYYY-MM-DD"
  gender: number;      // 1=Male, 2=Female, 3=Other (backend GenderOption)
  address?: string;
  phone?: string;
  insuranceID?: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  role: UserRole;
  status?: string;
  patientRequestDtos?: PatientProfile;
}

export interface UpdateUserRequest {
  userId?: string;
  userName?: string;
  email?: string;
  role?: string;
  status?: string;
  patientRequestDtos?: PatientProfile;
}
