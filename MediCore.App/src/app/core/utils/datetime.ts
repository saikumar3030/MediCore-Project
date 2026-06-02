// Local-time date/time helpers used by booking + scheduling flows.
//
// We deliberately do NOT use `Date.toISOString()` for "today" — that returns
// the UTC date, which can be one day ahead/behind the user's wall-clock date.
// Past-date/time checks have to be in the user's local timezone to match
// what the date picker shows them.

export function localTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Returns true if the date+time has already passed in the user's local timezone.
// `date` is "YYYY-MM-DD"; `time` is "HH:mm" or "HH:mm:ss".
export function isPastDateTime(date: string, time: string): boolean {
  if (!date) return false;
  const [y, m, d] = date.split('-').map(Number);
  const [hh = 0, mm = 0] = (time || '00:00').split(':').map(Number);
  const slot = new Date(y, m - 1, d, hh, mm, 0, 0);
  return slot.getTime() < Date.now();
}
