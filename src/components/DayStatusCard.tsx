import { format, parseISO } from 'date-fns'
import { Moon } from 'lucide-react'
import { useState } from 'react'
import { Card } from './ui'

const YOU = '#2a78d6'
const PARTNER = '#eb6834'

const formatTime = (ts: string) => format(parseISO(ts), 'h:mm a')

type Props = {
  date: string
  today: string
  /** When you marked the day done, or null. */
  mine: string | null
  /** When your partner marked the day done; null if not, undefined if there's no partner yet. */
  partner: string | null | undefined
  onChange: (done: boolean) => Promise<void>
}

/** "Done for the day" for you (with the toggle) and your partner. Hidden for future days. */
export function DayStatusCard({ date, today, mine, partner, onChange }: Props) {
  const [busy, setBusy] = useState(false)
  const isToday = date === today
  if (date > today) return null

  async function toggle(done: boolean) {
    setBusy(true)
    try {
      await onChange(done)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={`grid gap-4 ${partner === undefined ? '' : 'grid-cols-2'}`} style={{ animationDelay: '30ms' }}>
      <div className="min-w-0">
        <Label color={YOU}>You</Label>
        {mine ? (
          <div className="animate-pop">
            <DoneChip at={mine} />
            {isToday && (
              <button
                onClick={() => void toggle(false)}
                disabled={busy}
                className="mt-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-50"
              >
                Undo
              </button>
            )}
          </div>
        ) : isToday ? (
          <button
            onClick={() => void toggle(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition duration-200 hover:bg-indigo-100 active:scale-95 disabled:opacity-50"
          >
            <Moon size={15} aria-hidden />
            I'm done for today
          </button>
        ) : (
          <NotMarked />
        )}
      </div>

      {partner !== undefined && (
        <div className="min-w-0">
          <Label color={PARTNER}>Partner</Label>
          {partner ? (
            <div className="animate-pop">
              <DoneChip at={partner} />
            </div>
          ) : isToday ? (
            <p className="flex items-center gap-2 py-2 text-sm text-slate-500">
              <span className="size-2 animate-pulse rounded-full bg-amber-400" aria-hidden />
              Still going
            </p>
          ) : (
            <NotMarked />
          )}
        </div>
      )}
    </Card>
  )
}

function Label({ color, children }: { color: string; children: string }) {
  return (
    <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500">
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
      {children}
    </p>
  )
}

function DoneChip({ at }: { at: string }) {
  return (
    <p className="text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-2.5 py-1 font-semibold text-white">
        <Moon size={13} aria-hidden className="fill-white/30" />
        Done for the day
      </span>
      <span className="ml-1.5 text-xs text-slate-500">at {formatTime(at)}</span>
    </p>
  )
}

function NotMarked() {
  return <p className="py-2 text-sm text-slate-400">Didn't mark the day done</p>
}
