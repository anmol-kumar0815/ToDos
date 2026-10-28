import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDayWithOrdinal, formatMonthDay, formatShortDay } from '../lib/dates'
import type { DayStats } from '../lib/stats'

// Categorical slots 1 and 2 of the validated default palette.
const YOU = '#2a78d6'
const PARTNER = '#eb6834'

const pct = (c: DayStats['mine']) => (c.percent === null ? null : Math.round(c.percent))
const label = (c: DayStats['mine']) => (c.total === 0 ? 'No tasks' : `${c.done}/${c.total} (${pct(c)}%)`)

export function WeeklyChart({ days }: { days: DayStats[] }) {
  const [asTable, setAsTable] = useState(false)
  const long = days.length > 7
  const data = days.map((d) => ({
    // Weekday names fit up to a week; longer ranges need the date to tell bars apart.
    day: long ? formatMonthDay(d.date) : formatShortDay(d.date),
    date: d.date,
    you: pct(d.mine),
    partner: pct(d.partner),
    youLabel: label(d.mine),
    partnerLabel: label(d.partner),
  }))

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          onClick={() => setAsTable((v) => !v)}
          className="text-xs text-slate-600 underline"
        >
          {asTable ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-1 font-medium">Day</th>
                <th className="font-medium">You</th>
                <th className="font-medium">Partner</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-slate-100">
                  <td className="py-1">{formatDayWithOrdinal(d.date)}</td>
                  <td>{d.youLabel}</td>
                  <td>{d.partnerLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label="Daily completion percentage for you and your partner over the selected period" className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={long ? 16 : 0} interval={long ? 'preserveStartEnd' : 0} tick={{ fill: '#52514e', fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#52514e', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as (typeof data)[number]
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow">
                      <p className="mb-1 font-medium">{d.date}</p>
                      <p><span style={{ color: YOU }}>■</span> You: {d.youLabel}</p>
                      <p><span style={{ color: PARTNER }}>■</span> Partner: {d.partnerLabel}</p>
                    </div>
                  )
                }}
              />
              <Legend iconType="square" formatter={(v: string) => <span className="text-xs text-slate-700">{v}</span>} />
              <Bar dataKey="you" name="You" fill={YOU} radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="partner" name="Partner" fill={PARTNER} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
