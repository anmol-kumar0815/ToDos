import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { StreakCard } from '../components/StreakCard'
import { Card, InlineLoading } from '../components/ui'
import { WeeklyChart } from '../components/WeeklyChart'
import { useTasks } from '../hooks/useTasks'
import { daysInRange, formatDayWithOrdinal, shiftDate } from '../lib/dates'
import { RANGE_OPTIONS, resolveRange, type DateRange, type RangePreset } from '../lib/ranges'
import { dailyStats, streak, sumCompletion, togetherStreak } from '../lib/stats'

/** How much history the statistics views load. */
const HISTORY_DAYS = 180

type Props = {
  coupleId: string
  userId: string
  today: string
  view: 'week' | 'streaks'
}

export function StatsTab({ coupleId, userId, today, view }: Props) {
  const from = shiftDate(today, -(HISTORY_DAYS - 1))
  const { tasks, loading, error, reload } = useTasks(coupleId, from, today)
  const [preset, setPreset] = useState<RangePreset>('week')
  const [custom, setCustom] = useState<DateRange>(() => ({ start: shiftDate(today, -6), end: today }))

  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        Couldn't load statistics: {error}{' '}
        <button className="underline" onClick={() => void reload()}>Retry</button>
      </p>
    )
  }
  if (loading) return <InlineLoading label="Loading…" />

  if (view === 'streaks') {
    const mine = tasks.filter((t) => t.user_id === userId)
    const partner = tasks.filter((t) => t.user_id !== userId)
    return (
      <StreakCard
        rows={[
          { label: 'Together', streak: togetherStreak(mine, partner, today) },
          { label: 'You', streak: streak(mine, today) },
          { label: 'Partner', streak: streak(partner, today) },
        ]}
      />
    )
  }

  const range = resolveRange(preset, today, custom, from)
  const days = range ? dailyStats(tasks, userId, range.end, daysInRange(range.start, range.end)) : []
  const totals = {
    mine: sumCompletion(days.map((d) => d.mine)),
    partner: sumCompletion(days.map((d) => d.partner)),
    combined: sumCompletion(days.map((d) => d.combined)),
  }
  const fmt = (p: number | null) => (p === null ? '—' : `${Math.round(p)}%`)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays size={16} aria-hidden />
          <span className="sr-only">Period</span>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as RangePreset)}
            className="rounded-xl border border-slate-200 bg-white/80 py-1.5 pl-3 pr-2 text-sm font-medium text-slate-800 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {range && (
          <p key={`${range.start}${range.end}`} className="animate-fade-up text-right text-sm font-semibold tracking-tight">
            {range.start === range.end
              ? formatDayWithOrdinal(range.end)
              : `${formatDayWithOrdinal(range.start)} - ${formatDayWithOrdinal(range.end)}`}
          </p>
        )}
      </div>

      {preset === 'custom' && (
        <div className="animate-fade-up grid grid-cols-2 gap-3">
          <DateField
            label="From"
            value={custom.start}
            min={from}
            max={today}
            onChange={(start) => setCustom((c) => ({ ...c, start }))}
          />
          <DateField
            label="To"
            value={custom.end}
            min={from}
            max={today}
            onChange={(end) => setCustom((c) => ({ ...c, end }))}
          />
        </div>
      )}

      {range === null ? (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Choose a start date on or before the end date. Dates go back up to {HISTORY_DAYS} days.
        </p>
      ) : (
        <>
          <Card style={{ animationDelay: '60ms' }}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Summary label="You" color="#2a78d6" value={fmt(totals.mine.percent)} sub={`${totals.mine.done}/${totals.mine.total}`} />
              <Summary label="Partner" color="#eb6834" value={fmt(totals.partner.percent)} sub={`${totals.partner.done}/${totals.partner.total}`} />
              <Summary label="Together" color="#7c3aed" value={fmt(totals.combined.percent)} sub={`${totals.combined.done}/${totals.combined.total}`} />
            </div>
          </Card>

          <Card style={{ animationDelay: '120ms' }}>
            <h3 className="mb-2 font-semibold">Daily completion</h3>
            <WeeklyChart days={days} />
          </Card>
        </>
      )}
    </div>
  )
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  min: string
  max: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-base transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
      />
    </label>
  )
}

function Summary({ label, color, value, sub }: { label: string; color: string; value: string; sub: string }) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
        {label}
      </p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-slate-500">{sub} tasks</p>
    </div>
  )
}
