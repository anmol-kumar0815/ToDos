import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { getTasks } from '../features/tasks/taskService'
import type { Task } from '../types'

/**
 * Tasks for a couple over [from, to], kept fresh via Realtime. Realtime is
 * only a nudge to refetch; focus and reconnect also trigger a refetch.
 */
export function useTasks(coupleId: string, from: string, to: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)

  const reload = useCallback(async () => {
    const request = ++latest.current
    try {
      const next = await getTasks(coupleId, from, to)
      if (request !== latest.current) return // a newer request superseded this one
      setTasks(next)
      setError(null)
    } catch (err) {
      if (request !== latest.current) return
      setError(errorMessage(err))
    } finally {
      if (request === latest.current) setLoading(false)
    }
  }, [coupleId, from, to])

  useEffect(() => {
    setLoading(true)
    void reload()
  }, [reload])

  useEffect(() => {
    const channel = supabase
      // Unique per effect run so a channel still being torn down is never reused.
      .channel(`tasks:${coupleId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `couple_id=eq.${coupleId}`,
        },
        () => void reload(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void reload() // catches changes missed while disconnected
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [coupleId, from, to, reload])

  return { tasks, loading, error, reload }
}
