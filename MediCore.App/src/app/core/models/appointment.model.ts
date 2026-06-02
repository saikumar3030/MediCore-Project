export enum AppointmentStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Rescheduled = 'Rescheduled'
}

export enum ScheduleStatus {
  Available = 'Available',
  Booked = 'Booked'
}

export interface AppointmentUser {
  userId: string;
  userName: string;
  email: string;
  role: string;
  status: string;
}

export interface  Appointment {
  appointmentID: string;
  // Backend enrichment can fail to resolve the user (deleted account, missing
  // user row), in which case the field comes back null. Templates must guard.
  patient: AppointmentUser | null;
  doctor: AppointmentUser | null;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Schedule {
  scheduleID: string;
  doctorID: string;
  date: string;
  timeSlot: string;
  availability?: ScheduleStatus;
}

export interface CreateAppointmentRequest {
  doctorID: string;
  date: string;
  time: string;
  notes?: string;
}

export interface RescheduleRequest {
  newDate: string;
  newTime: string;
}

export interface CreateScheduleRequest {
  date: string;
  timeSlots: string[];
}
