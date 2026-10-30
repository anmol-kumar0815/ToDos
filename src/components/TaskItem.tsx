import { ArrowRight, Check, Clock, History, Link2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getTaskSpaces } from '../features/tasks/taskService'
import { backlogFrom, type DayTask } from '../lib/carryover'
import { formatDayMonthYear } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { formatDuration } from '../lib/duration'
import { priorityInfo } from '../lib/priority'
import type { Task, TaskInput } from '../types'
import { TaskForm, type SpaceOption } from './TaskForm'
import { Button } from './ui'

type Props = {
  task: DayTask
  editable: boolean
  index: number
  editing: boolean
  onStartEdit: (task: Task) => void
  onStopEdit: () => void
  onToggle: (task: Task) => void
  spaces: SpaceOption[]
  currentSpaceId: string
  onEdit: (task: Task, input: TaskInput, spaceIds: string[]) => Promise<void>
  onDelete: (task: Task) => void
}

export function TaskItem({
  task,
  editable,
  index,
  editing,
  onStartEdit,
  onStopEdit,
  spaces,
  currentSpaceId,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const done = task.completed_at !== null
  const linked = task.link_id !== null
  const backlog = backlogFrom(task)
  // An earlier day's view of a task that was carried over: shown for the record, read-only.
  const moved = task.movedTo !== null
  const priority = task.priority ? priorityInfo(task.priority) : null

  if (editing) {
    return (
      <li className="animate-fade-up rounded-2xl bg-slate-900/[0.03] p-3">
        <EditTask
          task={task}
          spaces={spaces}
          currentSpaceId={currentSpaceId}
          onSave={async (input, spaceIds) => {
            await onEdit(task, input, spaceIds)
            onStopEdit()
          }}
          onCancel={onStopEdit}
        />
      </li>
    )
  }

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className={`group animate-fade-up flex items-start gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-slate-900/[0.03] ${moved ? 'opacity-60' : ''}`}
    >
      <label className={`relative mt-0.5 flex shrink-0 ${editable ? 'cursor-pointer' : 'cursor-default'}`}>
        <input
          type="checkbox"
          checked={done}
          disabled={!editable}
          onChange={() => onToggle(task)}
          aria-label={`Mark "${task.title}" ${done ? 'incomplete' : 'complete'}`}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-transparent transition-all duration-300 peer-checked:scale-110 peer-checked:border-transparent peer-checked:bg-linear-to-br peer-checked:from-indigo-500 peer-checked:to-violet-600 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-500/30 peer-active:scale-90 peer-disabled:opacity-60"
        >
          <Check size={14} strokeWidth={3.5} className={done ? 'animate-pop' : ''} />
        </span>
      </label>

      <div className="min-w-0 flex-1">
        <p
          className={`break-words transition-colors duration-300 ${
            done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'
          }`}
        >
          {task.title}
        </p>
        {(priority || task.duration_minutes || linked || backlog || moved) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {priority && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${priority.badge}`}>
                {priority.label}
              </span>
            )}
            {backlog && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                <History size={11} aria-hidden />
                Backlog from {formatDayMonthYear(backlog)}
              </span>
            )}
            {moved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <ArrowRight size={11} aria-hidden />
                Moved to {formatDayMonthYear(task.movedTo!)}
              </span>
            )}
            {linked && (
              <span
                title="Added to several spaces. Changes apply to every copy."
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
              >
                <Link2 size={11} aria-hidden />
                Synced
              </span>
            )}
            {task.duration_minutes && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <Clock size={11} aria-hidden />
                {formatDuration(task.duration_minutes)}
              </span>
            )}
          </div>
        )}
        {task.notes && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-500">{task.notes}</p>
        )}
        {confirmingDelete && (
          <div role="alert" className="animate-fade-up mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            <span className="flex-1">Delete this task from every space it was added to?</span>
            <button
              onClick={() => {
                setConfirmingDelete(false)
                onDelete(task)
              }}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white transition active:scale-95"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="rounded-lg px-3 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {editable && (
        <span className="flex shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            aria-label={`Edit "${task.title}"`}
            onClick={() => onStartEdit(task)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-900/5 hover:text-slate-700"
          >
            <Pencil size={16} />
          </button>
          <button
            aria-label={`Delete "${task.title}"`}
            onClick={() => (linked ? setConfirmingDelete(true) : onDelete(task))}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </span>
      )}
    </li>
  )
}

/** Loads which spaces the task is in, so the form starts from the truth before changing it. */
function EditTask({
  task,
  spaces,
  currentSpaceId,
  onSave,
  onCancel,
}: {
  task: Task
  spaces: SpaceOption[]
  currentSpaceId: string
  onSave: (input: TaskInput, spaceIds: string[]) => Promise<void>
  onCancel: () => void
}) {
  const needsLookup = task.link_id !== null && spaces.length > 1
  const [spaceIds, setSpaceIds] = useState<string[] | null>(needsLookup ? null : [task.couple_id])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!needsLookup) return
    let cancelled = false
    getTaskSpaces(task)
      .then((ids) => !cancelled && setSpaceIds(ids))
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [needsLookup, task])

  // Never guess: saving with a wrong idea of where the copies are could delete real ones.
  if (error) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm text-red-700">
        <span className="flex-1">Couldn't load this task's spaces: {error}</span>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Close
        </Button>
      </div>
    )
  }
  if (spaceIds === null) {
    return <p role="status" className="py-2 text-sm text-slate-500">Loading…</p>
  }

  return (
    <TaskForm
      mode="edit"
      initial={{
        title: task.title,
        notes: task.notes,
        duration_minutes: task.duration_minutes,
        priority: task.priority,
      }}
      spaces={spaces}
      defaultSpaceId={currentSpaceId}
      initialSpaceIds={spaceIds}
      onSubmit={onSave}
      onCancel={onCancel}
    />
  )
}
