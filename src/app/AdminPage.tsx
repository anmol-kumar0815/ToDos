import { format, parseISO } from 'date-fns'
import { ArrowLeft, Check, ChevronDown, Clock, Link2, Mail, RefreshCw, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, InlineLoading } from '../components/ui'
import {
  getSignups,
  getSpaces,
  getSpaceTasks,
  type AdminSpace,
  type AdminTask,
  type Signup,
} from '../features/admin/adminService'
import { formatDayWithOrdinal } from '../lib/dates'
import { formatDuration } from '../lib/duration'
import { errorMessage } from '../lib/errors'
import { priorityInfo } from '../lib/priority'

type Overview = { signups: Signup[]; spaces: AdminSpace[] }

const formatTimestamp = (ts: string) => format(parseISO(ts), 'MMM d, yyyy, h:mm a')

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openSpace, setOpenSpace] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [signups, spaces] = await Promise.all([getSignups(), getSpaces()])
      setData({ signups, spaces })
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" aria-label="Back" className="rounded-full p-2.5!" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="flex-1 text-lg font-semibold tracking-tight">Admin</h2>
        <Button variant="ghost" aria-label="Refresh" className="rounded-full p-2.5!" onClick={() => void load()}>
          <RefreshCw size={18} />
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Couldn't load the admin data: {error}
        </p>
      ) : !data ? (
        <InlineLoading label="Loading…" />
      ) : (
        <>
          <Card>
            <SectionHeader icon={<Mail size={16} aria-hidden />} title="Signups" count={data.signups.length} />
            <ul className="divide-y divide-slate-100">
              {data.signups.map((s) => (
                <li key={s.email} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium">{s.email}</p>
                    {s.email_confirmed ? (
                      <Badge className="bg-emerald-50 text-emerald-700">Confirmed</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-800">Unconfirmed</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Joined {formatTimestamp(s.signed_up_at)}
                    {' · '}
                    {s.last_sign_in_at ? `last sign-in ${formatTimestamp(s.last_sign_in_at)}` : 'never signed in'}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card style={{ animationDelay: '60ms' }}>
            <SectionHeader icon={<Users size={16} aria-hidden />} title="Spaces" count={data.spaces.length} />
            <ul className="divide-y divide-slate-100">
              {data.spaces.map((space) => {
                const open = openSpace === space.id
                return (
                  <li key={space.id} className="py-1">
                    <button
                      onClick={() => setOpenSpace(open ? null : space.id)}
                      aria-expanded={open}
                      className="flex w-full items-start gap-2 rounded-xl px-1 py-2 text-left transition-colors hover:bg-slate-900/[0.03]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{space.name}</p>
                        <p className="mt-0.5 break-words text-xs text-slate-500">
                          {space.people ?? 'No members'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {space.members} of 2 members · {space.tasks} {space.tasks === 1 ? 'task' : 'tasks'} · created{' '}
                          {formatTimestamp(space.created_at)}
                        </p>
                      </div>
                      <ChevronDown
                        size={18}
                        aria-hidden
                        className={`mt-0.5 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {open && <SpaceTasks spaceId={space.id} />}
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}

function SpaceTasks({ spaceId }: { spaceId: string }) {
  const [tasks, setTasks] = useState<AdminTask[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSpaceTasks(spaceId)
      .then((rows) => !cancelled && setTasks(rows))
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [spaceId])

  if (error) return <p role="alert" className="px-1 pb-2 text-sm text-red-700">Couldn't load tasks: {error}</p>
  if (!tasks) return <p role="status" className="px-1 pb-2 text-sm text-slate-500">Loading tasks…</p>
  if (tasks.length === 0) return <p className="px-1 pb-2 text-sm text-slate-500">No tasks in this space.</p>

  return (
    <ul className="animate-fade-up mb-2 space-y-2 rounded-2xl bg-slate-900/[0.03] p-2">
      {tasks.map((t) => {
        const priority = t.priority ? priorityInfo(t.priority) : null
        return (
          <li key={t.id} className="rounded-xl bg-white/80 px-3 py-2">
            <div className="flex items-start gap-2">
              <span
                aria-label={t.done ? 'Done' : 'Not done'}
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                  t.done ? 'bg-linear-to-br from-indigo-500 to-violet-600 text-white' : 'border-2 border-slate-300'
                }`}
              >
                {t.done && <Check size={12} strokeWidth={3.5} aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`break-words ${t.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDayWithOrdinal(t.task_date)} · {t.owner}
                </p>
                {(priority || t.duration_minutes || t.synced) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {priority && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${priority.badge}`}>
                        {priority.label}
                      </span>
                    )}
                    {t.synced && (
                      <Badge className="bg-indigo-50 text-indigo-700">
                        <Link2 size={11} aria-hidden /> Synced
                      </Badge>
                    )}
                    {t.duration_minutes && (
                      <Badge className="bg-slate-900/5 text-slate-600">
                        <Clock size={11} aria-hidden /> {formatDuration(t.duration_minutes)}
                      </Badge>
                    )}
                  </div>
                )}
                {t.notes && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500">{t.notes}</p>}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <h3 className="font-semibold">{title}</h3>
      <span className="ml-auto rounded-full bg-slate-900/5 px-2.5 py-0.5 text-sm font-semibold text-slate-700 tabular-nums">
        {count}
      </span>
    </div>
  )
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  )
}
