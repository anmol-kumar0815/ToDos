import { Spinner } from '../components/ui'
import { AuthPage, ResetPasswordPage } from '../features/auth/AuthPage'
import { useAuth } from '../features/auth/AuthProvider'
import { OnboardingPage } from '../features/workspace/OnboardingPage'
import { useWorkspace } from '../features/workspace/useWorkspace'
import { Dashboard } from './Dashboard'

export function App() {
  const { session, loading, recovering } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <AuthPage />
  if (recovering) return <ResetPasswordPage />
  // Keyed by user so switching accounts never shows stale workspace state.
  return <Authenticated key={session.user.id} userId={session.user.id} />
}

function Authenticated({ userId }: { userId: string }) {
  const { workspaces, active, selectSpace, loading, error, reload } = useWorkspace(userId)

  // After creating or joining, refresh the list first so the new space exists before selecting it.
  async function spaceAdded(spaceId: string) {
    await reload()
    selectSpace(spaceId)
  }

  if (loading) return <Spinner />
  if (error && !active) {
    return (
      <main className="mx-auto max-w-sm p-6 text-center">
        <p role="alert" className="text-red-700">Couldn't load your spaces: {error}</p>
        <button className="mt-3 underline" onClick={() => void reload()}>Retry</button>
      </main>
    )
  }
  if (!active) return <OnboardingPage onDone={spaceAdded} />
  return (
    <Dashboard
      userId={userId}
      workspaces={workspaces}
      workspace={active}
      onSelect={selectSpace}
      onAdded={spaceAdded}
      onRefresh={() => void reload()}
    />
  )
}
