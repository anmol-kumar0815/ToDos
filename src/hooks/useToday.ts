import { useEffect, useState } from 'react'
import { todayIn } from '../lib/dates'

/** Today's calendar date in the workspace timezone; rolls over at midnight. */
export function useToday(timeZone: string): string {
  const [today, setToday] = useState(() => todayIn(timeZone))

  useEffect(() => {
    const update = () => setToday(todayIn(timeZone))
    update()
    const id = window.setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [timeZone])

  return today
}
