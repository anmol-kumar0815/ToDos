import { supabase } from '../../lib/supabase'
import type { Couple, Member, Workspace } from '../../types'

type MemberRow = Member & { couple_id: string }

/** Every space the signed-in user belongs to, in the order they joined. */
export async function getWorkspaces(userId: string): Promise<Workspace[]> {
  const memberships = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', userId)
    .order('joined_at')
  if (memberships.error) throw memberships.error

  const ids = memberships.data.map((m) => m.couple_id as string)
  if (ids.length === 0) return []

  const [couples, members] = await Promise.all([
    supabase.from('couples').select('id, name, timezone, invite_code').in('id', ids),
    supabase.from('couple_members').select('couple_id, user_id, role').in('couple_id', ids),
  ])
  if (couples.error) throw couples.error
  if (members.error) throw members.error

  const byId = new Map((couples.data as Couple[]).map((c) => [c.id, c]))
  return ids.flatMap((id) => {
    const couple = byId.get(id)
    if (!couple) return []
    return [
      {
        couple,
        members: (members.data as MemberRow[])
          .filter((m) => m.couple_id === id)
          .map(({ user_id, role }) => ({ user_id, role })),
      },
    ]
  })
}

/** Creates a space and returns its id. */
export async function createCouple(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_couple', { p_name: name })
  if (error) throw error
  return data as string
}

/** Joins a space by invite code and returns its id. */
export async function joinCouple(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_couple', { p_code: code })
  if (error) throw error
  return data as string
}
