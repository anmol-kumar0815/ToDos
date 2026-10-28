import { ArrowLeft, Check, Copy, Users } from 'lucide-react'
import { useState } from 'react'
import { Button, Card } from '../components/ui'
import { labelSpaces } from '../features/workspace/labels'
import { SpaceForms } from '../features/workspace/SpaceForms'
import type { Workspace } from '../types'

type Props = {
  workspaces: Workspace[]
  workspace: Workspace
  onSelect: (spaceId: string) => void
  onAdded: (spaceId: string) => void | Promise<void>
  onBack: () => void
}

export function SpacePage({ workspaces, workspace, onSelect, onAdded, onBack }: Props) {
  const { couple, members } = workspace
  const full = members.length >= 2
  const labels = labelSpaces(workspaces)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" aria-label="Back" className="rounded-full p-2.5!" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">Your space</h2>
      </div>

      <Card>
        <p className="text-sm text-slate-500">Current space</p>
        <p className="font-semibold">{labels.get(couple.id)}</p>
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <Users size={16} aria-hidden />
          {members.length} of 2 members
          {full ? ' · your partner has joined' : ' · waiting for your partner'}
        </p>
      </Card>

      {!full && <InviteCard code={couple.invite_code} />}

      {workspaces.length > 1 && (
        <Card>
          <h3 className="mb-2 font-semibold">Your spaces</h3>
          <ul className="divide-y divide-slate-100">
            {workspaces.map((w) => {
              const isActive = w.couple.id === couple.id
              return (
                <li key={w.couple.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{labels.get(w.couple.id)}</p>
                    <p className="text-xs text-slate-500">{w.members.length} of 2 members</p>
                  </div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      <Check size={12} aria-hidden /> Active
                    </span>
                  ) : (
                    <Button variant="ghost" className="py-1.5" onClick={() => onSelect(w.couple.id)}>
                      Switch
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <h3 className="px-1 pt-2 text-sm font-semibold text-slate-500">Add another space</h3>
      <SpaceForms onDone={onAdded} />
    </div>
  )
}

function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be unavailable (insecure context); the code is still visible to copy by hand.
    }
  }

  return (
    <Card className="border-indigo-200/70 bg-linear-to-br from-indigo-50/90 to-violet-50/90">
      <p className="text-sm font-semibold">Invite your partner</p>
      <p className="mt-1 text-xs text-slate-600">
        Share this code privately. It works for one more person and should be treated like a password.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 select-all break-all rounded-xl bg-white/90 px-3 py-2 text-xs">{code}</code>
        <Button variant="ghost" onClick={() => void copy()} aria-label="Copy invite code">
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
        </Button>
      </div>
      <p role="status" className="mt-2 h-4 text-xs font-medium text-emerald-700">
        {copied ? 'Copied to clipboard' : ''}
      </p>
    </Card>
  )
}
