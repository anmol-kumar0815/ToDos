import { ArrowUpDown, ChevronDown, Moon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { DayTask } from '../lib/carryover'
import { SORT_OPTIONS, sortTasks, type SortKey } from '../lib/sort'
import type { Task, TaskInput } from '../types'
import { TaskForm, type SpaceOption } from './TaskForm'
import { TaskItem } from './TaskItem'
import { Card } from './ui'

type Props = {
  /** The shown day's tasks, including read-only entries for tasks carried over from it. */
  tasks: DayTask[]
  userId: string
  /** Spaces the user can add a task to, and the one currently shown. */
  spaces: SpaceOption[]
  currentSpaceId: string
  /** When the partner marked the shown day done, or null. */
  partnerDoneAt: string | null
  onAdd: (input: TaskInput, spaceIds: string[]) => Promise<void>
  onToggle: (task: Task) => void
  onEdit: (task: Task, input: TaskInput, spaceIds: string[]) => Promise<void>
  onDelete: (task: Task) => void
}

const SORT_STORAGE_KEY = 'todos:sort'

function loadSort(): SortKey {
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY)
    return SORT_OPTIONS.some((o) => o.value === saved) ? (saved as SortKey) : 'newest'
  } catch {
    return 'newest' // storage can be unavailable (private mode)
  }
}

// Same hues as the weekly chart so each person keeps one color everywhere.
const YOU = '#2a78d6'
const PARTNER = '#eb6834'

function SectionTitle({
  color,
  children,
  count,
  action,
}: {
  color: string
  children: string
  count: number
  action?: ReactNode
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
      <h3 className="font-semibold">{children}</h3>
      <div className="ml-auto flex items-center gap-1.5">
        {action}
        <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-xs font-medium text-slate-500 tabular-nums">
          {count}
        </span>
      </div>
    </div>
  )
}

/** Compact text-style control; the real <select> sits invisibly on top so native pickers work. */
function SortMenu({ value, onChange }: { value: SortKey; onChange: (key: SortKey) => void }) {
  return (
    <span className="relative inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-slate-500 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/40 hover:bg-slate-900/5 hover:text-slate-800">
      <ArrowUpDown size={12} aria-hidden />
      Sort by
      <ChevronDown size={12} aria-hidden />
      <select
        aria-label="Sort tasks by"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  )
}

export function TaskList({
  tasks,
  userId,
  spaces,
  currentSpaceId,
  partnerDoneAt,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>(loadSort)
  const mine = sortTasks(tasks.filter((t) => t.user_id === userId), sort)
  const partner = sortTasks(tasks.filter((t) => t.user_id !== userId), sort)

  function changeSort(next: SortKey) {
    setSort(next)
    try {
      localStorage.setItem(SORT_STORAGE_KEY, next)
    } catch {
      // Not persisted; the choice still applies for this session.
    }
  }

  const handlers = {
    spaces,
    currentSpaceId,
    onToggle,
    onEdit,
    onDelete,
    onStartEdit: (task: Task) => setEditingId(task.id),
    onStopEdit: () => setEditingId(null),
  }
  // Checked against the live list so a task deleted elsewhere can't leave the add form hidden.
  const isEditing = mine.some((t) => t.id === editingId)

  return (
    <div className="space-y-4">
      <Card style={{ animationDelay: '60ms' }}>
        <SectionTitle
          color={YOU}
          count={mine.length}
          action={<SortMenu value={sort} onChange={changeSort} />}
        >
          Your tasks
        </SectionTitle>
        {mine.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-500">Nothing planned yet. Add your first task below.</p>
        ) : (
          <ul>
            {mine.map((t, i) => (
              <TaskItem
                key={t.id}
                task={t}
                index={i}
                editable={t.movedTo === null}
                editing={t.id === editingId}
                {...handlers}
              />
            ))}
          </ul>
        )}
        {/* Hidden while a task is being edited so there is only one form on screen. */}
        {!isEditing && (
          <div className="mt-3 animate-fade-up">
            <TaskForm mode="add" spaces={spaces} defaultSpaceId={currentSpaceId} onSubmit={onAdd} />
          </div>
        )}
      </Card>
      <Card style={{ animationDelay: '120ms' }}>
        <SectionTitle
          color={PARTNER}
          count={partner.length}
          action={
            partnerDoneAt && (
              <span className="animate-pop inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                <Moon size={12} aria-hidden /> Done for the day
              </span>
            )
          }
        >
          Partner's tasks
        </SectionTitle>
        {partner.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-500">No tasks yet</p>
        ) : (
          <ul>
            {partner.map((t, i) => (
              <TaskItem key={t.id} task={t} index={i} editable={false} editing={false} {...handlers} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
