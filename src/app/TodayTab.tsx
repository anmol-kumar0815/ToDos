import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { ProgressCard } from '../components/ProgressCard'
import type { SpaceOption } from '../components/TaskForm'
import { TaskList } from '../components/TaskList'
import { Button, InlineLoading } from '../components/ui'
import {
  addTask,
  deleteTask,
  saveTask,
  setTaskCompleted,
} from '../features/tasks/taskService'
import { useTasks } from '../hooks/useTasks'
import { formatLongDate, shiftDate } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { completion } from '../lib/stats'
import type { Task, TaskInput } from '../types'

type Props = {
  coupleId: string
  userId: string
  today: string
  /** Every space the user is in, for adding a task to several at once. */
  spaces: SpaceOption[]
}

export function TodayTab({ coupleId, userId, today, spaces }: Props) {
  // null means "follow today", so the view rolls over at midnight.
  const [selected, setSelected] = useState<string | null>(null)
  const date = selected ?? today
  const { tasks, loading, error, reload } = useTasks(coupleId, date, date)
  const [actionError, setActionError] = useState<string | null>(null)

  /** Runs a mutation, then refreshes. Failures show in the banner; resolves to whether it succeeded. */
  async function act(action: () => Promise<void>): Promise<boolean> {
    setActionError(null)
    try {
      await action()
      await reload()
      return true
    } catch (err) {
      setActionError(errorMessage(err))
      return false
    }
  }

  /** Like act, but rejects on failure so a form keeps what the user typed. */
  async function actOrThrow(action: () => Promise<void>) {
    if (!(await act(action))) throw new Error('Task was not saved')
  }

  const mine = tasks.filter((t) => t.user_id === userId)
  const partner = tasks.filter((t) => t.user_id !== userId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" aria-label="Previous day" className="rounded-full p-2.5!" onClick={() => setSelected(shiftDate(date, -1))}>
          <ChevronLeft size={20} />
        </Button>
        {/* Keyed by date so changing day replays the title animation. */}
        <div key={date} className="animate-fade-up text-center">
          <p className="text-lg font-semibold tracking-tight">{formatLongDate(date)}</p>
          {date === today ? (
            <p className="text-xs font-medium text-indigo-600">Today</p>
          ) : (
            <button className="text-xs font-medium text-indigo-600 hover:underline" onClick={() => setSelected(null)}>
              Back to today
            </button>
          )}
        </div>
        <Button variant="ghost" aria-label="Next day" className="rounded-full p-2.5!" onClick={() => setSelected(shiftDate(date, 1))}>
          <ChevronRight size={20} />
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Couldn't load tasks: {error}{' '}
          <button className="underline" onClick={() => void reload()}>Retry</button>
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
      )}

      {loading ? (
        <InlineLoading label="Loading tasks…" />
      ) : (
        <>
          <ProgressCard mine={completion(mine)} partner={completion(partner)} />
          <TaskList
            tasks={tasks}
            userId={userId}
            spaces={spaces}
            currentSpaceId={coupleId}
            onAdd={(input, spaceIds) => actOrThrow(() => addTask(spaceIds, userId, input, date))}
            onToggle={(t: Task) => void act(() => setTaskCompleted(t, t.completed_at === null))}
            onEdit={(t: Task, input: TaskInput, spaceIds: string[]) => actOrThrow(() => saveTask(t, input, spaceIds))}
            onDelete={(t: Task) => void act(() => deleteTask(t))}
          />
        </>
      )}
    </div>
  )
}
