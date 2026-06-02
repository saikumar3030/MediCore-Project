import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import axios from 'axios';

import { Appointment, Schedule, CreateAppointmentRequest, RescheduleRequest, CreateScheduleRequest } from '../models/appointment.model';
import { environment } from '../../../environments/environment';

// JWT is attached globally by registerAxiosAuthInterceptor (see app.config.ts).
@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly base = `${environment.apiGatewayUrl}/api`;

  // ── Appointments ────────────────────────────────────────────────

  book(request: CreateAppointmentRequest): Observable<Appointment> {
    return from(axios.post<Appointment>(`${this.base}/appointments`, request))
      .pipe(map(r => r.data));
  }

  getAll(): Observable<Appointment[]> {
    return from(axios.get<Appointment[]>(`${this.base}/appointments`))
      .pipe(map(r => r.data));
  }

  getById(id: string): Observable<Appointment> {
    return from(axios.get<Appointment>(`${this.base}/appointments/${id}`))
      .pipe(map(r => r.data));
  }

  reschedule(id: string, request: RescheduleRequest): Observable<Appointment> {
    return from(axios.put<Appointment>(`${this.base}/appointments/${id}/reschedule`, request))
      .pipe(map(r => r.data));
  }

  cancel(id: string): Observable<void> {
    return from(axios.put(`${this.base}/appointments/${id}/cancel`, {}))
      .pipe(map(() => undefined));
  }

  complete(id: string): Observable<void> {
    return from(axios.put(`${this.base}/appointments/${id}/complete`, {}))
      .pipe(map(() => undefined));
  }

  // Admin-only delete. Backend endpoint exists.
  deleteAppointment(id: string): Observable<void> {
    return from(axios.delete(`${this.base}/appointments/${id}`))
      .pipe(map(() => undefined));
  }

  // The two endpoints below are not implemented on the backend — calls will 404/405.
  updateNotes(id: string, notes: string): Observable<void> {
    return from(axios.patch(`${this.base}/appointments/${id}/notes`, { notes }))
      .pipe(map(() => undefined));
  }

  updateStatus(id: string, status: number): Observable<void> {
    return from(axios.put(`${this.base}/appointments/${id}/status`, { status }))
      .pipe(map(() => undefined));
  }

  // ── Schedules ───────────────────────────────────────────────────

  createSchedule(request: CreateScheduleRequest): Observable<void> {
    return from(axios.post(`${this.base}/schedules`, request))
      .pipe(map(() => undefined));
  }

  // Doctor-only: returns the calling doctor's full schedule (all availability statuses)
  // for a given date. Used to hide time slots that have already been created.
  getMyScheduleForDate(date: string): Observable<Schedule[]> {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    return from(axios.get(`${this.base}/schedules/mine?date=${formattedDate}`)).pipe(
      map(response => {
        const responseData = response.data;
        let rawList: any[];
        if (Array.isArray(responseData))            rawList = responseData;
        else if (responseData.$values)              rawList = responseData.$values;
        else if (responseData.value)                rawList = responseData.value;
        else if (responseData.data)                 rawList = responseData.data;
        else                                        rawList = [];
        return rawList.map(item => ({
          scheduleID:   item.scheduleID   ?? item.ScheduleID   ?? '',
          doctorID:     item.doctorID     ?? item.DoctorID     ?? '',
          date:         item.date         ?? item.Date         ?? '',
          timeSlot:     item.timeSlot     ?? item.TimeSlot     ?? '',
          availability: item.availability ?? item.Availability
        } as Schedule));
      })
    );
  }

  getSchedules(doctorId: string, date: string): Observable<Schedule[]> {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const url = `${this.base}/schedules/${doctorId}/?date=${formattedDate}`;

    return from(axios.get(url)).pipe(
      map(response => {
        const responseData = response.data;

        // Backend may wrap the list in $values / value / data, or send it raw.
        let rawList: any[];
        if (Array.isArray(responseData))            rawList = responseData;
        else if (responseData.$values)              rawList = responseData.$values;
        else if (responseData.value)                rawList = responseData.value;
        else if (responseData.data)                 rawList = responseData.data;
        else                                        rawList = [];

        // Normalize PascalCase / camelCase property variants.
        return rawList.map(item => ({
          scheduleID:   item.scheduleID   ?? item.ScheduleID   ?? '',
          doctorID:     item.doctorID     ?? item.DoctorID     ?? '',
          date:         item.date         ?? item.Date         ?? '',
          timeSlot:     item.timeSlot     ?? item.TimeSlot     ?? '',
          availability: item.availability ?? item.Availability
        } as Schedule));
      })
    );
  }
}
