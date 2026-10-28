import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

const DATE_FORMAT = 'yyyy-MM-dd'

/** Calendar date (yyyy-MM-dd) of "now" in the given IANA timezone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // The en-CA locale formats dates as yyyy-MM-dd.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), DATE_FORMAT)
}

/** The `count` dates ending at (and including) `end`, oldest first. */
export function lastDays(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    shiftDate(end, i - (count - 1)),
  )
}

export function formatLongDate(date: string): string {
  return format(parseISO(date), 'EEEE, MMMM d')
}

export function formatShortDay(date: string): string {
  return format(parseISO(date), 'EEE')
}

/** "Oct 23rd, Fri" */
export function formatDayWithOrdinal(date: string): string {
  return format(parseISO(date), 'MMM do, EEE')
}

/** Number of calendar days from `start` to `end`, both included. */
export function daysInRange(start: string, end: string): number {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1
}

/** "Oct 23" */
export function formatMonthDay(date: string): string {
  return format(parseISO(date), 'MMM d')
}
