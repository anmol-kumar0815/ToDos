import type { Priority } from '../types'

export const PRIORITIES: { value: Priority; label: string; badge: string; active: string }[] = [
  { value: 1, label: 'Urgent', badge: 'bg-red-50 text-red-700 ring-red-200', active: 'bg-red-600 text-white border-red-600' },
  { value: 2, label: 'High', badge: 'bg-amber-50 text-amber-800 ring-amber-200', active: 'bg-amber-500 text-white border-amber-500' },
  { value: 3, label: 'Medium', badge: 'bg-sky-50 text-sky-700 ring-sky-200', active: 'bg-sky-600 text-white border-sky-600' },
  { value: 4, label: 'Low', badge: 'bg-slate-100 text-slate-600 ring-slate-200', active: 'bg-slate-600 text-white border-slate-600' },
]

export function priorityInfo(value: Priority) {
  return PRIORITIES.find((p) => p.value === value)!
}
