import type { Task } from '../types'
import { shiftDate } from './dates'

/** A task as it stood on one day. `movedTo` is set when it was unfinished and carried over. */
export type DayTask = Task & { movedTo: string | null }

/**
 * One entry per day each task was planned for. A task carried over from earlier days appears,
 * unfinished, on each of those days (with `movedTo` set to where it is now) and, as itself, on
 * its current day. This keeps past days honest: a task that slipped still counts as unfinished
 * on the day it slipped from.
 */
export function expandCarryOvers(tasks: Task[]): DayTask[] {
  const entries: DayTask[] = []
  for (const task of tasks) {
    if (task.original_date && task.original_date < task.task_date) {
      for (let d = task.original_date; d < task.task_date; d = shiftDate(d, 1)) {
        entries.push({ ...task, task_date: d, completed_at: null, movedTo: task.task_date })
      }
    }
    entries.push({ ...task, movedTo: null })
  }
  return entries
}

/** The day a task was first planned for, when it's been carried over to a later day. */
export function backlogFrom(task: Task): string | null {
  return task.original_date && task.original_date < task.task_date ? task.original_date : null
}
