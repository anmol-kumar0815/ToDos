import type { Task } from '../types'
import { lastDays, shiftDate } from './dates'

export type Completion = {
  done: number
  total: number
  /** null when there are no tasks, so the UI never shows a misleading 100%. */
  percent: number | null
}

export function completion(tasks: Task[]): Completion {
  const total = tasks.length
  const done = tasks.filter((t) => t.completed_at !== null).length
  return {
    done,
    total,
    percent: total === 0 ? null : (done / total) * 100,
  }
}

export type DayStats = {
  date: string
  mine: Completion
  partner: Completion
  combined: Completion
}

/** Per-day stats for the `days` dates ending at `end`. */
export function dailyStats(
  tasks: Task[],
  userId: string,
  end: string,
  days = 7,
): DayStats[] {
  return lastDays(end, days).map((date) => {
    const onDay = tasks.filter((t) => t.task_date === date)
    return {
      date,
      mine: completion(onDay.filter((t) => t.user_id === userId)),
      partner: completion(onDay.filter((t) => t.user_id !== userId)),
      combined: completion(onDay),
    }
  })
}

/**
 * Weekly completion uses total completed / total tasks across the days,
 * not the average of daily percentages.
 */
export function sumCompletion(parts: Completion[]): Completion {
  const done = parts.reduce((n, c) => n + c.done, 0)
  const total = parts.reduce((n, c) => n + c.total, 0)
  return { done, total, percent: total === 0 ? null : (done / total) * 100 }
}

export type Streak = {
  /** Consecutive counting days ending today (or yesterday while today is still open). */
  current: number
  best: number
}

/** Dates (up to `today`) on which at least one of the given tasks is completed. */
export function completedDates(tasks: Task[], today: string): Set<string> {
  const dates = new Set<string>()
  for (const t of tasks) {
    if (t.completed_at !== null && t.task_date <= today) dates.add(t.task_date)
  }
  return dates
}

/**
 * Streak over a set of counting days. A missing day breaks the streak, except that today,
 * while still in progress, neither extends nor breaks the *current* streak.
 */
export function streakFromDates(dates: Set<string>, today: string): Streak {
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const date of [...dates].sort()) {
    run = prev !== null && shiftDate(prev, 1) === date ? run + 1 : 1
    best = Math.max(best, run)
    prev = date
  }

  let current = 0
  let cursor = dates.has(today) ? today : shiftDate(today, -1)
  while (dates.has(cursor)) {
    current++
    cursor = shiftDate(cursor, -1)
  }

  return { current, best }
}

/** One person's streak: days on which they completed at least one task. */
export function streak(tasks: Task[], today: string): Streak {
  return streakFromDates(completedDates(tasks, today), today)
}

/** Shared streak: days on which both people completed at least one task. */
export function togetherStreak(mine: Task[], partner: Task[], today: string): Streak {
  const theirs = completedDates(partner, today)
  const both = new Set([...completedDates(mine, today)].filter((d) => theirs.has(d)))
  return streakFromDates(both, today)
}
