import { ChevronDown, LogOut, Users } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Button, InlineLoading, Logo } from '../components/ui'
import { signOut } from '../features/auth/authService'
import { labelSpaces } from '../features/workspace/labels'
import { useToday } from '../hooks/useToday'
import { APP_NAME } from '../lib/app'
import type { Workspace } from '../types'
import { SpacePage } from './SpacePage'
import { TodayTab } from './TodayTab'

// Statistics pulls in the charting library, so load it only when opened.
const StatsTab = lazy(() => import('./StatsTab').then((m) => ({ default: m.StatsTab })))

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Statistics' },
  { id: 'streaks', label: 'Streaks' },
] as const
type TabId = (typeof TABS)[number]['id']

type Props = {
  userId: string
  /** Every space the user belongs to. */
  workspaces: Workspace[]
  /** The space currently shown. */
  workspace: Workspace
  onSelect: (spaceId: string) => void
  onAdded: (spaceId: string) => void | Promise<void>
  /** Re-fetches the spaces, e.g. to see whether the partner has joined. */
  onRefresh: () => void
}

export function Dashboard({ userId, workspaces, workspace, onSelect, onAdded, onRefresh }: Props) {
  const { couple, members } = workspace
  const [tab, setTab] = useState<TabId>('today')
  const [showSpace, setShowSpace] = useState(false)
  const today = useToday(couple.timezone)
  const labels = labelSpaces(workspaces)
  const spaceOptions = workspaces.map((w) => ({ id: w.couple.id, label: labels.get(w.couple.id)! }))
  const activeIndex = TABS.findIndex((t) => t.id === tab)

  // Full width on phones and tablets; a centered column on desktop, where it would look stretched.
  return (
    <div className="min-h-dvh px-3 pb-12 lg:mx-auto lg:max-w-lg lg:px-4">
      <div className="sticky top-0 z-10 -mx-3 bg-[#f6f7fb]/80 px-3 pb-3 lg:-mx-4 lg:px-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <header className="mb-3 flex items-center gap-3">
          <Logo size={36} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight tracking-tight">{APP_NAME}</h1>
            <SpaceSwitcher workspaces={workspaces} activeId={couple.id} onSelect={onSelect} />
          </div>
          <Button
            variant="ghost"
            aria-label={members.length < 2 ? 'Your space (invite your partner)' : 'Your space'}
            aria-pressed={showSpace}
            className="relative"
            onClick={() => {
              if (!showSpace) onRefresh()
              setShowSpace((v) => !v)
            }}
          >
            <Users size={18} />
            {/* Nudge until the partner has joined. */}
            {members.length < 2 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-indigo-500 ring-2 ring-[#f6f7fb]" aria-hidden />
            )}
          </Button>
          <Button variant="ghost" aria-label="Sign out" onClick={() => void signOut()}>
            <LogOut size={18} />
          </Button>
        </header>

        {!showSpace && (
          <nav aria-label="Sections" className="relative grid grid-cols-3 rounded-2xl bg-slate-900/[0.06] p-1">
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            />
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`relative z-10 rounded-xl py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                  tab === t.id ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Keyed by view so each switch replays the entrance animation. */}
      <div key={showSpace ? 'space' : `${couple.id}:${tab}`} className="mt-4 animate-fade-up">
        {showSpace ? (
          <SpacePage
            workspaces={workspaces}
            workspace={workspace}
            onSelect={onSelect}
            onAdded={onAdded}
            onBack={() => setShowSpace(false)}
          />
        ) : tab === 'today' ? (
          <TodayTab coupleId={couple.id} userId={userId} today={today} spaces={spaceOptions} />
        ) : (
          <Suspense fallback={<InlineLoading label="Loading…" />}>
            <StatsTab coupleId={couple.id} userId={userId} today={today} view={tab} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

/** Space name under the app title; a native picker when the user has more than one space. */
function SpaceSwitcher({
  workspaces,
  activeId,
  onSelect,
}: {
  workspaces: Workspace[]
  activeId: string
  onSelect: (spaceId: string) => void
}) {
  const labels = labelSpaces(workspaces)
  const name = labels.get(activeId)

  if (workspaces.length < 2) {
    return <p className="truncate text-xs text-slate-500">{name}</p>
  }

  return (
    <span className="relative -ml-2 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/40">
      <span className="truncate">{name}</span>
      <ChevronDown size={12} aria-hidden className="shrink-0" />
      <select
        aria-label="Switch space"
        value={activeId}
        onChange={(e) => onSelect(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        {workspaces.map((w) => (
          <option key={w.couple.id} value={w.couple.id}>
            {labels.get(w.couple.id)}
          </option>
        ))}
      </select>
    </span>
  )
}
