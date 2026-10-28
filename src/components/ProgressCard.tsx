import type { Completion } from '../lib/stats'
import { Card } from './ui'

const YOU = '#2a78d6'
const PARTNER = '#eb6834'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function PersonRing({ label, color, c }: { label: string; color: string; c: Completion }) {
  const percent = c.percent ?? 0
  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <div
        role="progressbar"
        aria-label={`${label} completion`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="relative size-32 shrink-0"
      >
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {c.percent === null ? (
            <span className="px-4 text-center text-xs text-slate-500">No tasks yet</span>
          ) : (
            <>
              <span className="text-3xl font-bold tabular-nums">{Math.round(c.percent)}%</span>
              <span className="text-[11px] text-slate-500">complete</span>
            </>
          )}
        </div>
      </div>
      <div className="w-full">
        <p className="mb-1.5 flex items-center justify-center gap-2 text-sm font-medium">
          <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
          {label}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${c.percent ?? 0}%`, background: color }}
          />
        </div>
        <p className="mt-1.5 text-center text-xs text-slate-500 tabular-nums">
          {c.percent === null ? 'No tasks yet' : `${c.done}/${c.total} tasks`}
        </p>
      </div>
    </div>
  )
}

export function ProgressCard({ mine, partner }: { mine: Completion; partner: Completion }) {
  return (
    <Card className="flex items-start gap-4">
      <PersonRing label="You" color={YOU} c={mine} />
      <PersonRing label="Partner" color={PARTNER} c={partner} />
    </Card>
  )
}
