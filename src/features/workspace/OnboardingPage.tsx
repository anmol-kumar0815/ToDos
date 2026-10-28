import { Shell } from '../auth/AuthPage'
import { SpaceForms } from './SpaceForms'

export function OnboardingPage({ onDone }: { onDone: (spaceId: string) => void | Promise<void> }) {
  return (
    <Shell>
      <SpaceForms onDone={onDone} />
    </Shell>
  )
}
