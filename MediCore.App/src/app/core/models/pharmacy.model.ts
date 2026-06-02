// Enums = numbers (must match backend values).
// Response objects = enums arrive as STRINGS (backend uses .ToString()).
// Request objects  = enums are sent as INTEGERS.
export enum MedicineType {
  Tablet = 1,
  Capsule = 2,
  Syrup = 3,
  Injection = 4,
  Cream = 5,
  Drops = 6
}

export enum MedicineStatus {
  Active = 1,
  Inactive = 2,
  OutOfStock = 3,
  Expired = 4
}

export enum DispenseStatus {
  Pending = 1,
  Dispensed = 2,
  Cancelled = 3
}

export interface Medicine {
  medicineID: string;
  name: string;
  type: string;          // "Tablet" | "Capsule" | "Syrup" | "Injection" | "Cream" | "Drops"
  stock: number;
  expiryDate: string;    // "YYYY-MM-DD"
  status: string;        // "Active" | "Inactive" | "OutOfStock" | "Expired"
  createdAt: string;
  updatedAt?: string;
}

export interface Dispense {
  dispenseID: string;
  medicineID: string;
  medicineName: string;  // enriched server-side
  prescriptionID: string;
  pharmacistID: string;
  quantity: number;
  status: string;        // "Pending" | "Dispensed" | "Cancelled"
  date: string;
}

export interface CreateMedicineRequest {
  name: string;
  type: MedicineType;
  stock: number;
  expiryDate: string;    // "YYYY-MM-DD" → backend DateOnly
}

// Stock update is ADDITIVE — backend does `medicine.Stock += dto.Quantity`.
export interface UpdateStockRequest {
  quantity: number;
}

export interface UpdateMedicineStatusRequest {
  status: MedicineStatus;
}

export interface CreateDispenseRequest {
  medicineID: string;
  prescriptionID: string;
  quantity: number;
}

// Issued prescriptions surfaced to the pharmacist's dispense dropdown.
// Patient name is enriched server-side from the User table.
export interface IssuedPrescription {
  prescriptionID: string;
  emrid: string;
  patientID: string;
  patientName: string;
  doctorID: string;
  medicine: string;     // free-text medicine name from doctor's order
  dosage: string;
  frequency: string;
  duration: string;
  createdAt: string;
}
