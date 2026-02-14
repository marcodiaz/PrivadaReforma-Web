import { describe, expect, it } from 'vitest'
import {
  getItem,
  migrateIfNeeded,
  removeItem,
  schemaVersion,
  setItem,
} from './storage'

describe('storage', () => {
  it('persiste y elimina valores', () => {
    setItem('storage-test', { ok: true })
    expect(getItem<{ ok: boolean }>('storage-test')?.ok).toBe(true)
    removeItem('storage-test')
    expect(getItem('storage-test')).toBe(null)
  })

  it('migrateIfNeeded establece schemaVersion', () => {
    migrateIfNeeded()
    expect(getItem<number>('schemaVersion')).toBe(schemaVersion)
  })
})
