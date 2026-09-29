export interface CalendarEvent {
  id?: string | number;
  day: string;
  month: string;
  year: number;
  time: string;
  tag: string;
  title: string;
  desc: string;
  location?: string;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_ABBR = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function eventDate(ev: Pick<CalendarEvent, 'year' | 'month' | 'day'>): Date {
  return new Date(ev.year, MONTH_ABBR.indexOf(ev.month), Number(ev.day));
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function monthLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function filterMonth<T extends Pick<CalendarEvent, 'year' | 'month' | 'day'>>(
  events: T[],
  year: number,
  month: number
): T[] {
  return events
    .filter((ev) => {
      const d = new Date(ev.year, MONTH_ABBR.indexOf(ev.month), Number(ev.day));
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => Number(a.day) - Number(b.day));
}
