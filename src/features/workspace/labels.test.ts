import { describe, expect, it } from 'vitest'
import type { Workspace } from '../../types'
import { labelSpaces } from './labels'

const space = (id: string, name: string): Workspace => ({
  couple: { id, name, timezone: 'UTC', invite_code: id },
  members: [],
})

describe('labelSpaces', () => {
  it('keeps unique names as they are', () => {
    const labels = labelSpaces([space('a', 'Home'), space('b', 'Work')])
    expect(labels.get('a')).toBe('Home')
    expect(labels.get('b')).toBe('Work')
  })

  it('numbers duplicates after the first', () => {
    const labels = labelSpaces([space('a', 'Our space'), space('b', 'Our space'), space('c', 'Our space')])
    expect([labels.get('a'), labels.get('b'), labels.get('c')]).toEqual([
      'Our space',
      'Our space (2)',
      'Our space (3)',
    ])
  })
})
