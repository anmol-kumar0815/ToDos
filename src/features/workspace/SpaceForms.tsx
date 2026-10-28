import { useState, type FormEvent } from 'react'
import { Button, Card, Field } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { createCouple, joinCouple } from './workspaceService'

/** Create-a-space and join-with-a-code cards. Calls `onDone` with the id of the space. */
export function SpaceForms({ onDone }: { onDone: (spaceId: string) => void | Promise<void> }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<string>, reset: () => void) {
    setBusy(true)
    setError(null)
    try {
      const id = await action()
      reset()
      await onDone(id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function create(e: FormEvent) {
    e.preventDefault()
    void run(() => createCouple(name), () => setName(''))
  }

  function join(e: FormEvent) {
    e.preventDefault()
    void run(() => joinCouple(code), () => setCode(''))
  }

  return (
    <>
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Start a new space</h2>
        <p className="mb-4 text-sm text-slate-600">
          You'll get an invite code to share with your partner.
        </p>
        <form onSubmit={create} className="space-y-3">
          <Field
            label="Name (optional)"
            placeholder="Our space"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full">
            Create space
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Join with an invite code</h2>
        <p className="mb-4 text-sm text-slate-600">
          Paste the code your partner shared with you.
        </p>
        <form onSubmit={join} className="space-y-3">
          <Field
            label="Invite code"
            required
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full">
            Join space
          </Button>
        </form>
      </Card>
      {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}
    </>
  )
}
