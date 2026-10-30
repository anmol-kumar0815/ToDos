export type Priority = 1 | 2 | 3 | 4

export type Task = {
  id: string
  couple_id: string
  user_id: string
  title: string
  notes: string | null
  /** Planned time in minutes, 1..1440. */
  duration_minutes: number | null
  priority: Priority | null
  /** Shared by the copies of a task added to several spaces; null for a single-space task. */
  link_id: string | null
  task_date: string
  /** The day it was first planned for, once it's been carried over to a later day. */
  original_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** What the user edits on a task (everything except ownership, date and completion). */
export type TaskInput = {
  title: string
  notes: string | null
  duration_minutes: number | null
  priority: Priority | null
}

export type Couple = {
  id: string
  name: string
  timezone: string
  invite_code: string
}

export type Member = {
  user_id: string
  role: 'owner' | 'member'
}

export type Workspace = {
  couple: Couple
  members: Member[]
}
