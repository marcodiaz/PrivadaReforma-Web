import { describe, expect, it } from 'vitest'
import { enqueueOfflineEvent, syncOfflineQueue } from './offline'

describe('offline queue', () => {
  it('encola evento offline', () => {
    const queue = enqueueOfflineEvent([], {
      id: 'q1',
      at: new Date().toISOString(),
      type: 'qr_validation',
      payload: { targetId: 'qr-1', result: 'allow' },
      guardUserId: 'guard-1',
      synced: false,
    })
    expect(queue).toHaveLength(1)
    expect(queue[0]?.synced).toBe(false)
  })

  it('sincroniza eventos al volver online', () => {
    const result = syncOfflineQueue(
      [
        {
          id: 'q1',
          at: new Date().toISOString(),
          type: 'qr_validation',
          payload: { targetId: 'qr-1', result: 'reject' },
          guardUserId: 'guard-1',
          synced: false,
        },
      ],
      [],
    )
    expect(result.syncedCount).toBe(1)
    expect(result.nextQueue[0]?.synced).toBe(true)
    expect(result.nextAuditLog).toHaveLength(1)
  })
})
