import { describe, expect, it } from 'vitest'
import { backlogFrom, expandCarryOvers } from './carryover'
import { daysInRange, formatDayMonthYear, formatDayWithOrdinal, shiftDate, todayIn } from './dates'
import { resolveRange } from './ranges'
import { formatDuration, splitMinutes, toMinutes } from './duration'
import { sortTasks } from './sort'
import { completion, dailyStats, streak, sumCompletion, togetherStreak } from './stats'
import type { Priority, Task } from '../types'

let n = 0
function task(date: string, done: boolean, user = 'me'): Task {
  n++
  return {
    id: String(n),
    couple_id: 'c',
    user_id: user,
    title: `t${n}`,
    notes: null,
    duration_minutes: null,
    priority: null,
    link_id: null,
    task_date: date,
    original_date: null,
    completed_at: done ? '2026-01-01T00:00:00Z' : null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('completion', () => {
  it('is null with no tasks', () => {
    expect(completion([]).percent).toBeNull()
  })

  it('matches the worked example: 4/5, 3/4 -> 77.8% combined', () => {
    const mine = [...Array(4).fill(0).map(() => task('2026-10-29', true)), task('2026-10-29', false)]
    const hers = [...Array(3).fill(0).map(() => task('2026-10-29', true, 'her')), task('2026-10-29', false, 'her')]
    expect(completion(mine).percent).toBe(80)
    expect(completion(hers).percent).toBe(75)
    expect(completion([...mine, ...hers]).percent).toBeCloseTo(77.78, 1)
  })

  it('weekly total is not the average of daily percentages', () => {
    const tasks = [
      task('2026-10-28', true), // day 1: 1/1 = 100%
      ...Array(9).fill(0).map((_, i) => task('2026-10-29', i === 0)), // day 2: 1/9
    ]
    const days = dailyStats(tasks, 'me', '2026-10-29', 2)
    expect(sumCompletion(days.map((d) => d.combined)).percent).toBe(20)
  })
})

describe('dailyStats', () => {
  it('splits mine and partner and covers empty days', () => {
    const tasks = [task('2026-10-29', true), task('2026-10-29', false, 'her')]
    const days = dailyStats(tasks, 'me', '2026-10-29', 3)
    expect(days.map((d) => d.date)).toEqual(['2026-10-27', '2026-10-28', '2026-10-29'])
    expect(days[0].combined.percent).toBeNull()
    expect(days[2].mine.percent).toBe(100)
    expect(days[2].partner.percent).toBe(0)
  })
})

describe('streak', () => {
  const today = '2026-10-29'

  it('counts consecutive days with a completed task, including today', () => {
    const tasks = [task('2026-10-27', true), task('2026-10-28', true), task('2026-10-29', true)]
    expect(streak(tasks, today)).toEqual({ current: 3, best: 3 })
  })

  it('counts a day when just one of several tasks is completed', () => {
    const tasks = [
      task('2026-10-28', true),
      task('2026-10-28', false),
      task('2026-10-28', false),
      task('2026-10-29', true),
      task('2026-10-29', false),
    ]
    expect(streak(tasks, today)).toEqual({ current: 2, best: 2 })
  })

  it('does not break the current streak while today has nothing completed yet', () => {
    const tasks = [task('2026-10-27', true), task('2026-10-28', true), task('2026-10-29', false)]
    expect(streak(tasks, today)).toEqual({ current: 2, best: 2 })
  })

  it('breaks on a day with no tasks', () => {
    const tasks = [task('2026-10-26', true), task('2026-10-28', true), task('2026-10-29', true)]
    expect(streak(tasks, today)).toEqual({ current: 2, best: 2 })
  })

  it('breaks on a day with tasks but none completed', () => {
    const tasks = [
      task('2026-10-27', true),
      task('2026-10-28', false),
      task('2026-10-28', false),
      task('2026-10-29', true),
    ]
    expect(streak(tasks, today)).toEqual({ current: 1, best: 1 })
  })

  it('tracks best separately from current', () => {
    const tasks = [
      task('2026-10-20', true),
      task('2026-10-21', true),
      task('2026-10-22', true),
      task('2026-10-28', true),
    ]
    expect(streak(tasks, today)).toEqual({ current: 1, best: 3 })
  })

  it('is zero when yesterday was missed and today has nothing completed', () => {
    expect(streak([task('2026-10-27', true)], today)).toEqual({ current: 0, best: 1 })
  })

  it('ignores future-dated tasks', () => {
    expect(streak([task('2026-10-30', true)], today)).toEqual({ current: 0, best: 0 })
  })
})

describe('togetherStreak', () => {
  const today = '2026-10-29'

  it('needs both people to complete at least one task on the day', () => {
    const mine = [task('2026-10-27', true), task('2026-10-28', true), task('2026-10-29', true)]
    const hers = [task('2026-10-27', true, 'her'), task('2026-10-28', false, 'her'), task('2026-10-29', true, 'her')]
    expect(togetherStreak(mine, hers, today)).toEqual({ current: 1, best: 1 })
  })

  it('counts days when both completed something', () => {
    const mine = [task('2026-10-28', true), task('2026-10-29', true)]
    const hers = [task('2026-10-28', true, 'her'), task('2026-10-28', false, 'her'), task('2026-10-29', true, 'her')]
    expect(togetherStreak(mine, hers, today)).toEqual({ current: 2, best: 2 })
  })

  it('does not break while today is open', () => {
    const mine = [task('2026-10-28', true), task('2026-10-29', true)]
    const hers = [task('2026-10-28', true, 'her'), task('2026-10-29', false, 'her')]
    expect(togetherStreak(mine, hers, today)).toEqual({ current: 1, best: 1 })
  })

  it('is zero when the partner has no tasks at all', () => {
    expect(togetherStreak([task('2026-10-29', true)], [], today)).toEqual({ current: 0, best: 0 })
  })
})

describe('dates', () => {
  it('formats a day as "Oct 23rd, Fri"', () => {
    expect(formatDayWithOrdinal('2026-10-23')).toBe('Oct 23rd, Fri')
    expect(formatDayWithOrdinal('2026-10-29')).toBe('Oct 29th, Thu')
    expect(formatDayWithOrdinal('2026-11-01')).toBe('Nov 1st, Sun')
    expect(formatDayWithOrdinal('2026-11-12')).toBe('Nov 12th, Thu')
  })

  it('shifts across month and year boundaries', () => {
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('resolves today in the workspace timezone, not UTC', () => {
    // 20:00 UTC on Oct 28 is already Oct 29 in India (UTC+5:30).
    const now = new Date('2026-10-28T20:00:00Z')
    expect(todayIn('Asia/Kolkata', now)).toBe('2026-10-29')
    expect(todayIn('UTC', now)).toBe('2026-10-28')
  })
})

describe('duration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(110)).toBe('1h 50m')
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(120)).toBe('2h')
  })

  it('converts fields to minutes, treating empty/zero as none', () => {
    expect(toMinutes('1', '50')).toBe(110)
    expect(toMinutes('', '30')).toBe(30)
    expect(toMinutes('2', '')).toBe(120)
    expect(toMinutes('', '')).toBeNull()
    expect(toMinutes('0', '0')).toBeNull()
  })

  it('round-trips through splitMinutes', () => {
    expect(splitMinutes(110)).toEqual({ hours: '1', minutes: '50' })
    expect(splitMinutes(60)).toEqual({ hours: '1', minutes: '' })
    expect(splitMinutes(null)).toEqual({ hours: '', minutes: '' })
  })
})

describe('sortTasks', () => {
  const t = (title: string, priority: Priority | null, duration: number | null): Task => ({
    ...task('2026-10-29', false),
    title,
    priority,
    duration_minutes: duration,
  })
  const a = t('a', null, null)
  const b = t('b', 3, 90)
  const c = t('c', 1, 30)
  const d = t('d', 3, null)
  const e = t('e', 1, 120)
  const titles = (list: Task[]) => list.map((x) => x.title).join('')

  // Inputs are oldest-first, like the API returns them.
  it('newest puts the most recently added first', () => {
    expect(titles(sortTasks([a, b, c, d, e], 'newest'))).toBe('edcba')
  })

  it('sorts urgent first, ties newest-first, unset last', () => {
    expect(titles(sortTasks([a, b, c, d, e], 'priority'))).toBe('ecdba')
  })

  it('sorts shortest first with unset times last', () => {
    expect(titles(sortTasks([a, b, c, d, e], 'time-asc'))).toBe('cbeda')
  })

  it('sorts longest first with unset times still last', () => {
    expect(titles(sortTasks([a, b, c, d, e], 'time-desc'))).toBe('ebcda')
  })

  it('does not mutate the input', () => {
    const list = [b, c]
    sortTasks(list, 'priority')
    expect(titles(list)).toBe('bc')
  })
})

describe('resolveRange', () => {
  const earliest = '2026-05-03'
  const none = { start: '', end: '' }

  it('this week runs Monday to today', () => {
    // 2026-10-29 is a Thursday.
    expect(resolveRange('week', '2026-10-29', none, earliest)).toEqual({ start: '2026-10-26', end: '2026-10-29' })
  })

  it('this week on a Sunday starts the previous Monday', () => {
    expect(resolveRange('week', '2026-11-01', none, earliest)).toEqual({ start: '2026-10-26', end: '2026-11-01' })
  })

  it('this week on a Monday is just that day', () => {
    expect(resolveRange('week', '2026-10-26', none, earliest)).toEqual({ start: '2026-10-26', end: '2026-10-26' })
  })

  it('last 7 days includes today and the six before', () => {
    const r = resolveRange('last7', '2026-10-29', none, earliest)!
    expect(r).toEqual({ start: '2026-10-23', end: '2026-10-29' })
    expect(daysInRange(r.start, r.end)).toBe(7)
  })

  it('this month runs from the 1st to today', () => {
    expect(resolveRange('month', '2026-10-29', none, earliest)).toEqual({ start: '2026-10-01', end: '2026-10-29' })
  })

  it('custom ranges are clamped to the loaded history and today', () => {
    expect(
      resolveRange('custom', '2026-10-29', { start: '2025-01-01', end: '2027-01-01' }, earliest),
    ).toEqual({ start: earliest, end: '2026-10-29' })
  })

  it('custom ranges with start after end are invalid', () => {
    expect(resolveRange('custom', '2026-10-29', { start: '2026-10-20', end: '2026-10-10' }, earliest)).toBeNull()
  })

  it('counts days across a month boundary', () => {
    expect(daysInRange('2026-10-30', '2026-11-02')).toBe(4)
  })
})

describe('carry-overs', () => {
  // Carried from Oct 27 to today, Oct 29.
  const carried = (done: boolean): Task => ({ ...task('2026-10-29', done), original_date: '2026-10-27' })

  it('formats the backlog date as DD-MM-YYYY', () => {
    expect(formatDayMonthYear('2026-10-29')).toBe('29-10-2026')
    expect(formatDayMonthYear('2026-01-05')).toBe('05-01-2026')
  })

  it('tags carried tasks with the day they were first planned for', () => {
    expect(backlogFrom(carried(false))).toBe('2026-10-27')
    expect(backlogFrom(task('2026-10-29', false))).toBeNull()
  })

  it('shows a carried task, unfinished and moved, on each day it slipped from', () => {
    const entries = expandCarryOvers([carried(true)])
    expect(entries.map((e) => [e.task_date, e.completed_at !== null, e.movedTo])).toEqual([
      ['2026-10-27', false, '2026-10-29'],
      ['2026-10-28', false, '2026-10-29'],
      ['2026-10-29', true, null],
    ])
  })

  it('leaves tasks that never moved alone', () => {
    const t = task('2026-10-29', false)
    expect(expandCarryOvers([t])).toEqual([{ ...t, movedTo: null }])
  })

  it('keeps past days honest in daily stats', () => {
    const tasks = [task('2026-10-28', true), { ...task('2026-10-29', true), original_date: '2026-10-28' }]
    const days = dailyStats(expandCarryOvers(tasks), 'me', '2026-10-29', 2)
    // Oct 28: one done, one that slipped to Oct 29.
    expect([days[0].mine.done, days[0].mine.total]).toEqual([1, 2])
    expect([days[1].mine.done, days[1].mine.total]).toEqual([1, 1])
  })

  it('does not change streaks: slipped days still count if something was completed', () => {
    const tasks = [task('2026-10-28', true), { ...task('2026-10-29', false), original_date: '2026-10-28' }]
    expect(streak(expandCarryOvers(tasks), '2026-10-29')).toEqual({ current: 1, best: 1 })
  })
})
