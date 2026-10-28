import { format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { shiftDate } from './dates'

export type RangePreset = 'week' | 'last7' | 'month' | 'custom'

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
]

export type DateRange = { start: string; end: string }

const DATE_FORMAT = 'yyyy-MM-dd'
/** Weeks run Monday to Sunday. */
const WEEK_STARTS_ON = 1

/**
 * Resolves a preset to concrete dates. Presets end today, since days that haven't happened
 * yet have nothing to measure. A custom range is clamped to [earliest, today]; it returns
 * null when the start is after the end.
 */
export function resolveRange(
  preset: RangePreset,
  today: string,
  custom: DateRange,
  earliest: string,
): DateRange | null {
  switch (preset) {
    case 'week':
      return {
        start: format(startOfWeek(parseISO(today), { weekStartsOn: WEEK_STARTS_ON }), DATE_FORMAT),
        end: today,
      }
    case 'last7':
      return { start: shiftDate(today, -6), end: today }
    case 'month':
      return { start: format(startOfMonth(parseISO(today)), DATE_FORMAT), end: today }
    case 'custom': {
      const start = custom.start < earliest ? earliest : custom.start
      const end = custom.end > today ? today : custom.end
      return start <= end ? { start, end } : null
    }
  }
}
