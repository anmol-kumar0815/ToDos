import { Check, Clock, Layers, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MAX_HOURS, splitMinutes, toMinutes } from '../lib/duration'
import { PRIORITIES } from '../lib/priority'
import type { Priority, TaskInput } from '../types'
import { Button } from './ui'

export type SpaceOption = { id: string; label: string }

type Props = {
  mode: 'add' | 'edit'
  initial?: TaskInput
  /** The spaces a task can live in, and the current one (selected by default when adding). */
  spaces?: SpaceOption[]
  defaultSpaceId?: string
  /** Edit mode only: the spaces the task currently exists in. */
  initialSpaceIds?: string[]
  /** `spaceIds` are the chosen spaces: where to add the task, or where it should end up. */
  onSubmit: (input: TaskInput, spaceIds: string[]) => Promise<void>
  onCancel?: () => void
}

const inputClass =
  'rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-base transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15'

/** Title plus optional notes, planned duration and priority. Used to add and to edit. */
export function TaskForm({ mode, initial, spaces = [], defaultSpaceId, initialSpaceIds, onSubmit, onCancel }: Props) {
  const duration = splitMinutes(initial?.duration_minutes ?? null)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [hours, setHours] = useState(duration.hours)
  const [minutes, setMinutes] = useState(duration.minutes)
  const [priority, setPriority] = useState<Priority | null>(initial?.priority ?? null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSpaceIds ?? (defaultSpaceId ? [defaultSpaceId] : [])),
  )
  const [notice, setNotice] = useState<string | null>(null)
  const pickSpaces = spaces.length > 1
  const allSelected = spaces.length > 0 && spaces.every((s) => selected.has(s.id))

  function toggleSpace(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next.size === 0 ? prev : next // a task needs at least one space
    })
  }

  function toggleAll() {
    setSelected(new Set(allSelected && defaultSpaceId ? [defaultSpaceId] : spaces.map((s) => s.id)))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      try {
        await onSubmit(
          {
            title: title.trim(),
            notes: notes.trim() || null,
            duration_minutes: toMinutes(hours, minutes),
            priority,
          },
          pickSpaces ? [...selected] : defaultSpaceId ? [defaultSpaceId] : [],
        )
      } catch {
        return // the parent shows the error; keep the user's input
      }
      if (mode === 'add') {
        setTitle('')
        setNotes('')
        setHours('')
        setMinutes('')
        setPriority(null)
        if (pickSpaces) {
          const names = spaces.filter((sp) => selected.has(sp.id)).map((sp) => sp.label)
          setNotice(`Added to ${names.join(', ')}`)
          window.setTimeout(() => setNotice(null), 3500)
          // Back to just the current space, so a later add never goes to many by accident.
          setSelected(new Set(defaultSpaceId ? [defaultSpaceId] : []))
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && onCancel?.()}
      className="space-y-3"
    >
      <div className="flex gap-2">
        <input
          autoFocus={mode === 'edit'}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === 'add' ? 'Add a task…' : 'Task title'}
          aria-label={mode === 'add' ? 'New task' : 'Task title'}
          className={`${inputClass} min-w-0 flex-1 ${mode === 'add' ? 'rounded-full px-4 py-2.5' : ''}`}
        />
        {mode === 'add' ? (
          <Button type="submit" disabled={busy || !title.trim()} aria-label="Add task" className="rounded-full px-3.5">
            <Plus size={20} />
          </Button>
        ) : (
          <>
            <Button type="submit" disabled={busy || !title.trim()} aria-label="Save" className="px-3">
              <Check size={18} />
            </Button>
            <Button type="button" variant="ghost" aria-label="Cancel" onClick={onCancel} className="px-3">
              <X size={18} />
            </Button>
          </>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <textarea
            value={notes}
            maxLength={2000}
            rows={3}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember about this task…"
            className={`${inputClass} w-full resize-none`}
          />
        </label>

        <fieldset>
          <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Clock size={14} aria-hidden /> Time needed{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </legend>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_HOURS}
              step={1}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              aria-label="Hours"
              placeholder="0"
              className={`${inputClass} w-20`}
            />
            hrs
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              step={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              aria-label="Minutes"
              placeholder="0"
              className={`${inputClass} w-20`}
            />
            min
          </div>
        </fieldset>

        <div role="radiogroup" aria-label="Priority">
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Priority <span className="font-normal text-slate-400">(optional)</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map((p) => {
              const selected = priority === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  // Clicking the selected option clears it, since priority is optional.
                  onClick={() => setPriority(selected ? null : p.value)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition duration-200 active:scale-95 ${
                    selected
                      ? `${p.active} shadow-sm`
                      : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {pickSpaces && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Layers size={14} aria-hidden /> {mode === 'add' ? 'Add to' : 'In spaces'}
            </p>
            <div className="flex flex-wrap gap-2">
              <SpaceChip pressed={allSelected} onClick={toggleAll}>
                All spaces
              </SpaceChip>
              {spaces.map((sp) => (
                <SpaceChip key={sp.id} pressed={selected.has(sp.id)} onClick={() => toggleSpace(sp.id)}>
                  {sp.label}
                </SpaceChip>
              ))}
            </div>
            {mode === 'edit' && (
              <p className="mt-1.5 text-xs text-slate-500">
                Changes apply to every selected space. Unselecting a space removes the task from it.
              </p>
            )}
          </div>
        )}
      </div>
      {notice && (
        <p role="status" className="animate-fade-up text-xs font-medium text-emerald-700">
          {notice}
        </p>
      )}
    </form>
  )
}

function SpaceChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-200 active:scale-95 ${
        pressed
          ? 'border-transparent bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
          : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300'
      }`}
    >
      {pressed && <Check size={12} aria-hidden className="shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  )
}
