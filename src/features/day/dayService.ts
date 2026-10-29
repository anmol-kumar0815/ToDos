import { supabase } from '../../lib/supabase'

/** When each of the given people marked `day` done, by user id. People who haven't are absent. */
export async function getDayDone(userIds: string[], day: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('day_done')
    .select('user_id, done_at')
    .eq('day', day)
    .in('user_id', userIds)
    .not('done_at', 'is', null)
  if (error) throw error
  return new Map(data.map((row) => [row.user_id as string, row.done_at as string]))
}

/** Marks (or un-marks) the user done for the day. */
export async function setDayDone(userId: string, day: string, done: boolean) {
  const { error } = await supabase
    .from('day_done')
    .upsert(
      { user_id: userId, day, done_at: done ? new Date().toISOString() : null },
      { onConflict: 'user_id,day' },
    )
  if (error) throw error
}
