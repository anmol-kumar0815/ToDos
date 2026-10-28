import { Flame, Trophy } from 'lucide-react'
import type { Streak } from '../lib/stats'
import { Card } from './ui'

type Row = { label: string; streak: Streak }

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

export function StreakCard({ rows }: { rows: Row[] }) {
  const [together, ...people] = rows
  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="text-sm font-medium text-slate-500">{together.label} streak</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Flame
            size={40}
            aria-hidden
            className={
              together.streak.current > 0
                ? 'animate-float fill-orange-400 text-orange-500'
                : 'text-slate-300'
            }
          />
          <span className="text-6xl font-bold tabular-nums">{together.streak.current}</span>
        </div>
        <p className="text-sm text-slate-500">
          {together.streak.current === 1 ? 'day' : 'days'} in a row
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <Trophy size={13} aria-hidden /> Best: {days(together.streak.best)}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {people.map(({ label, streak }, i) => (
          <Card key={label} style={{ animationDelay: `${(i + 1) * 70}ms` }}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold tabular-nums">
              <Flame
                size={20}
                aria-hidden
                className={streak.current > 0 ? 'fill-orange-400 text-orange-500' : 'text-slate-300'}
              />
              {days(streak.current)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Best: {days(streak.best)}</p>
          </Card>
        ))}
      </div>

      <p className="px-2 text-center text-xs text-slate-500">
        A day counts when you complete at least one task. For the shared streak, you both need to
        complete at least one.
      </p>
    </div>
  )
}
