import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../../lib/errors'
import type { Workspace } from '../../types'
import { getWorkspaces } from './workspaceService'

const storageKey = (userId: string) => `todos:space:${userId}`

function loadSelected(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId))
  } catch {
    return null // storage can be unavailable (private mode)
  }
}

/** All of the user's spaces, plus which one is active (remembered per user on this device). */
export function useWorkspace(userId: string) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(() => loadSelected(userId))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setWorkspaces(await getWorkspaces(userId))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectSpace = useCallback(
    (id: string) => {
      setSelectedId(id)
      try {
        localStorage.setItem(storageKey(userId), id)
      } catch {
        // Not persisted; the choice still applies for this session.
      }
    },
    [userId],
  )

  // A remembered space the user has since left (or never had) falls back to the first one.
  const active = workspaces.find((w) => w.couple.id === selectedId) ?? workspaces[0] ?? null

  return { workspaces, active, selectSpace, loading, error, reload }
}
