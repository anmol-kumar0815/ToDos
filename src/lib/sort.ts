import type { Task } from '../types'

export type SortKey = 'newest' | 'priority' | 'time-asc' | 'time-desc'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'priority', label: 'Priority (urgent first)' },
  { value: 'time-asc', label: 'Time needed (shortest first)' },
  { value: 'time-desc', label: 'Time needed (longest first)' },
]

/**
 * Returns a sorted copy. `tasks` must be oldest-first (the order the API returns them).
 * The base order is newest-first; the other sorts are stable on top of it, so ties stay
 * newest-first, and tasks missing the sorted value always go last.
 */
export function sortTasks<T extends Task>(tasks: T[], key: SortKey): T[] {
  const newestFirst = [...tasks].reverse()
  if (key === 'newest') return newestFirst

  const value = (t: T): number | null =>
    key === 'priority' ? t.priority : t.duration_minutes
  const direction = key === 'time-desc' ? -1 : 1

  return newestFirst.sort((a, b) => {
    const x = value(a)
    const y = value(b)
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    return (x - y) * direction
  })
}
