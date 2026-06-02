import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { AppointmentService } from '../../core/services/appointment.service';
import { Schedule } from '../../core/models/appointment.model';
import { localTodayISO, isPastDateTime } from '../../core/utils/datetime';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule.component.html'
})
export class ScheduleComponent {
  private appointmentService = inject(AppointmentService);

  scheduleDate  = signal('');
  selectedTimes = signal<string[]>([]);
  // Time slots the doctor has already created for the chosen date — kept so we
  // can disable them in the picker rather than letting the doctor pick duplicates.
  existingTimes = signal<Set<string>>(new Set<string>());
  formLoading   = signal(false);
  success       = signal('');
  error         = signal('');

  readonly todayISO = localTodayISO();

  // Full day: 07:00 → 21:00 in 30-minute steps (29 slots)
  readonly timeSlots: string[] = Array.from({ length: 29 }, (_, i) => {
    const totalMinutes = 7 * 60 + i * 30;
    const hours        = Math.floor(totalMinutes / 60);
    const minutes      = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });

  isSlotSelected(slot: string): boolean {
    return this.selectedTimes().includes(slot);
  }

  isSlotInPast(slot: string): boolean {
    const date = this.scheduleDate();
    return !!date && isPastDateTime(date, slot);
  }

  isSlotAlreadyCreated(slot: string): boolean {
    // Backend serializes TimeOnly as "HH:mm:ss" — strip seconds before comparing.
    const set = this.existingTimes();
    return set.has(slot) || set.has(`${slot}:00`);
  }

  isSlotDisabled(slot: string): boolean {
    return this.isSlotInPast(slot) || this.isSlotAlreadyCreated(slot);
  }

  toggleSlot(slot: string): void {
    if (this.isSlotDisabled(slot)) return;
    const current = this.selectedTimes();
    if (current.includes(slot)) {
      this.selectedTimes.set(current.filter(t => t !== slot));
    } else {
      this.selectedTimes.set([...current, slot]);
    }
  }

  onDateChange(value: string): void {
    this.scheduleDate.set(value);
    // Drop any previously-picked slots that are now in the past for the new date.
    this.selectedTimes.update(times => times.filter(t => !isPastDateTime(value, t)));

    // Fetch existing slots for this date so we can disable them in the picker.
    this.existingTimes.set(new Set<string>());
    if (!value) return;
    this.appointmentService.getMyScheduleForDate(value)
      .pipe(catchError(() => of<Schedule[]>([])))
      .subscribe(slots => {
        this.existingTimes.set(new Set(slots.map(s => s.timeSlot)));
        // Drop any newly-picked slots that turn out to already exist.
        this.selectedTimes.update(times => times.filter(t => !this.isSlotAlreadyCreated(t)));
      });
  }

  clearSlots(): void {
    this.selectedTimes.set([]);
  }

  formatSlot(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  createSchedule(): void {
    const date  = this.scheduleDate();
    const times = this.selectedTimes();
    if (!date || times.length === 0) return;

    if (isPastDateTime(date, '23:59')) {
      this.error.set('You cannot create a schedule for a past date.');
      return;
    }
    if (times.some(t => isPastDateTime(date, t))) {
      this.error.set('One or more selected time slots are in the past.');
      return;
    }
    if (times.some(t => this.isSlotAlreadyCreated(t))) {
      this.error.set('One or more selected slots already exist in your schedule.');
      return;
    }

    this.formLoading.set(true);
    this.error.set('');

    this.appointmentService.createSchedule({ date, timeSlots: times }).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.success.set(`${times.length} slot${times.length > 1 ? 's' : ''} created successfully!`);
        // Move the newly-created slots into the "existing" set so they show as disabled
        // immediately, in case the doctor stays on the same date and adds more.
        this.existingTimes.update(set => {
          const next = new Set(set);
          times.forEach(t => next.add(t));
          return next;
        });
        this.selectedTimes.set([]);
        setTimeout(() => this.success.set(''), 3000);
      },
      error: err => {
        this.formLoading.set(false);
        const msg = err?.response?.data?.message ?? err?.response?.data?.title ?? err?.message ?? 'Failed to create slots.';
        this.error.set(msg);
      }
    });
  }
}
