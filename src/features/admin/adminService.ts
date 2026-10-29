import { supabase } from '../../lib/supabase'
import type { Priority } from '../../types'

export type Signup = {
  email: string
  signed_up_at: string
  email_confirmed: boolean
  last_sign_in_at: string | null
}

export type AdminSpace = {
  id: string
  name: string
  created_at: string
  members: number
  people: string | null
  tasks: number
}

export type AdminTask = {
  id: string
  task_date: string
  owner: string
  title: string
  priority: Priority | null
  duration_minutes: number | null
  done: boolean
  synced: boolean
  notes: string | null
}

/** Asks the server; the page is only a convenience, the admin functions enforce access. */
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_app_admin')
  if (error) throw error
  return data === true
}

export async function getSignups(): Promise<Signup[]> {
  const { data, error } = await supabase.rpc('admin_signups')
  if (error) throw error
  return data as Signup[]
}

export async function getSpaces(): Promise<AdminSpace[]> {
  const { data, error } = await supabase.rpc('admin_spaces')
  if (error) throw error
  // Postgres bigint counts can arrive as strings.
  return (data as AdminSpace[]).map((s) => ({ ...s, members: Number(s.members), tasks: Number(s.tasks) }))
}

export async function getSpaceTasks(spaceId: string): Promise<AdminTask[]> {
  const { data, error } = await supabase.rpc('admin_space_tasks', { p_couple_id: spaceId })
  if (error) throw error
  return data as AdminTask[]
}
