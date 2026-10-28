import { supabase } from '../../lib/supabase'
import type { Task, TaskInput } from '../../types'

/**
 * Scopes a query to the task and, when it was added to several spaces, all of its copies.
 * Ownership is also pinned here, on top of RLS, so a link can only ever reach the caller's rows.
 */
function forTask<Q extends { eq: (column: string, value: string) => Q }>(query: Q, task: Task): Q {
  return task.link_id
    ? query.eq('link_id', task.link_id).eq('user_id', task.user_id)
    : query.eq('id', task.id)
}

const PAGE_SIZE = 1000

/** Tasks for the couple with task_date in [from, to], paging past the API row cap. */
export async function getTasks(
  coupleId: string,
  from: string,
  to: string,
): Promise<Task[]> {
  const tasks: Task[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('task_date', from)
      .lte('task_date', to)
      .order('created_at')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    tasks.push(...(data as Task[]))
    if (data.length < PAGE_SIZE) return tasks
  }
}

/**
 * Adds the task to every given space. Each space gets its own independent copy, written in a
 * single request so either all copies are created or none are.
 */
export async function addTask(
  coupleIds: string[],
  userId: string,
  input: TaskInput,
  date: string,
) {
  // Copies in several spaces are linked so later changes apply to all of them.
  const linkId = coupleIds.length > 1 ? crypto.randomUUID() : null
  const rows = coupleIds.map((coupleId) => ({
    couple_id: coupleId,
    user_id: userId,
    task_date: date,
    link_id: linkId,
    ...input,
  }))
  const { error } = await supabase.from('tasks').insert(rows)
  if (error) throw error
}

/** The spaces this task (and its linked copies) currently exist in. */
export async function getTaskSpaces(task: Task): Promise<string[]> {
  if (!task.link_id) return [task.couple_id]
  const { data, error } = await supabase
    .from('tasks')
    .select('couple_id')
    .eq('link_id', task.link_id)
    .eq('user_id', task.user_id)
  if (error) throw error
  return data.map((row) => row.couple_id as string)
}

/**
 * Saves the task's fields and makes it exist in exactly `spaceIds`: linked copies are updated,
 * copies in unselected spaces are removed and new ones are added, all in one transaction.
 */
export async function saveTask(task: Task, input: TaskInput, spaceIds: string[]) {
  const { error } = await supabase.rpc('save_task', {
    p_task_id: task.id,
    p_title: input.title,
    p_notes: input.notes,
    p_duration: input.duration_minutes,
    p_priority: input.priority,
    p_couple_ids: spaceIds,
  })
  if (error) throw error
}

/** Completes or reopens the task, and every linked copy, with one shared timestamp. */
export async function setTaskCompleted(task: Task, completed: boolean) {
  const { error } = await forTask(
    supabase
      .from('tasks')
      .update({ completed_at: completed ? new Date().toISOString() : null }),
    task,
  )
  if (error) throw error
}

/** Deletes the task, and every linked copy in other spaces. */
export async function deleteTask(task: Task) {
  const { error } = await forTask(supabase.from('tasks').delete(), task)
  if (error) throw error
}
