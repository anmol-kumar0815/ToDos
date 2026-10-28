/** Longest planned duration: 23h 59m, which stays inside the database's 1440-minute limit. */
export const MAX_HOURS = 23

/** "1h 50m", "45m", "2h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : ''].filter(Boolean).join(' ')
}

/** Hours + minutes fields to total minutes; null when both are empty or zero. */
export function toMinutes(hours: string, minutes: string): number | null {
  const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0)
  return total > 0 ? total : null
}

export function splitMinutes(total: number | null): { hours: string; minutes: string } {
  if (total === null) return { hours: '', minutes: '' }
  const h = Math.floor(total / 60)
  const m = total % 60
  return { hours: h ? String(h) : '', minutes: m ? String(m) : '' }
}
