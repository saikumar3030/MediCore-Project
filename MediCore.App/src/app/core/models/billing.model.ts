export enum BillStatus {
  Draft = 'Draft',
  Issued = 'Issued',
  Pending = 'Pending',
  Paid = 'Paid',
  Partial = 'Partial',
  Overdue = 'Overdue',
  Cancelled = 'Cancelled'
}

export enum PaymentMethod {
  Cash = 1,
  Card = 2,
  UPI = 3,
  Insurance = 4,
  BankTransfer = 5
}

export enum PaymentStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Failed = 'Failed',
  Refunded = 'Refunded'
}

export enum ClaimStatus {
  Submitted = 'Submitted',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Paid = 'Paid'
}

export interface Bill {
  billID: string;
  patientID: string;
  amount: number;
  paidAmount: number;
  status: BillStatus;
  description: string;
  date: string;
  updatedAt?: string;
  payments?: Payment[];
  insuranceClaims?: InsuranceClaim[];
}

export interface Payment {
  paymentID: string;
  billID: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
}

export interface InsuranceClaim {
  claimID: string;
  billID: string;
  patientID: string;
  insuranceID: string;
  claimedAmount: number;
  status: ClaimStatus;
  submittedAt: string;
  updatedAt?: string;
}

export interface CreateBillRequest {
  patientID: string;
  amount: number;
  description: string;
}

export interface UpdateBillStatusRequest {
  status: BillStatus;
}

export interface CreatePaymentRequest {
  billID: string;
  amount: number;
  method: PaymentMethod;
  transactionRef?: string;
}

export interface CreateClaimRequest {
  billID: string;
  insuranceID: string;
  claimedAmount: number;
}

export interface UpdateClaimStatusRequest {
  status: ClaimStatus;
}
