import type { Workspace } from '../../types'

/**
 * Display names by space id. Spaces that share a name get " (2)", " (3)"… so they can be
 * told apart in a picker (everyone starts with the default "Our space").
 */
export function labelSpaces(workspaces: Workspace[]): Map<string, string> {
  const seen = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const { couple } of workspaces) {
    const n = (seen.get(couple.name) ?? 0) + 1
    seen.set(couple.name, n)
    labels.set(couple.id, n === 1 ? couple.name : `${couple.name} (${n})`)
  }
  return labels
}
