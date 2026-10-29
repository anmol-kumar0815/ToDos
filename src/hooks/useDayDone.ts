import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDayDone } from '../features/day/dayService'

/**
 * Who among `userIds` has marked `day` done, kept fresh via Realtime, focus and reconnect.
 * `available` turns false if the status can't be loaded (for example before the migration is
 * applied), so the feature hides itself instead of breaking the page.
 */
export function useDayDone(userIds: string[], day: string) {
  const [doneAt, setDoneAt] = useState<Map<string, string>>(new Map())
  const [available, setAvailable] = useState(false)
  const latest = useRef(0)
  // A string key so a new array with the same ids doesn't restart the subscription.
  const ids = userIds.join(',')

  const reload = useCallback(async () => {
    const request = ++latest.current
    try {
      const next = await getDayDone(ids.split(','), day)
      if (request !== latest.current) return
      setDoneAt(next)
      setAvailable(true)
    } catch {
      if (request === latest.current) setAvailable(false)
    }
  }, [ids, day])

  useEffect(() => {
    void reload()

    const channel = supabase
      .channel(`day_done:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'day_done', filter: `user_id=in.(${ids})` },
        () => void reload(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void reload()
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
  }, [ids, reload])

  return { doneAt, available, reload }
}
