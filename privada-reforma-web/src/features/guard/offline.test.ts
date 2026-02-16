import { describe, expect, it } from 'vitest'
import { enqueueOfflineEvent, flushOfflineQueueWithApi, syncOfflineQueue } from './offline'

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

  it('flushea acciones de paquete usando API mock', async () => {
    const calls: string[] = []
    const result = await flushOfflineQueueWithApi(
      [
        {
          id: 'pkg-ready-1',
          at: new Date().toISOString(),
          type: 'package_mark_ready',
          payload: { packageId: 'pkg-1' },
          guardUserId: 'user-1',
          synced: false,
        },
        {
          id: 'pkg-deliver-1',
          at: new Date().toISOString(),
          type: 'package_deliver',
          payload: { packageId: 'pkg-1' },
          guardUserId: 'guard-1',
          synced: false,
        },
      ],
      [],
      {
        registerPackage: async () => true,
        markPackageReady: async (packageId) => {
          calls.push(`ready:${packageId}`)
          return true
        },
        deliverPackage: async (packageId) => {
          calls.push(`deliver:${packageId}`)
          return true
        },
        createIncident: async () => true,
        voteIncident: async () => true,
        updateIncident: async () => true,
      },
    )

    expect(calls).toEqual(['ready:pkg-1', 'deliver:pkg-1'])
    expect(result.syncedCount).toBe(2)
    expect(result.nextQueue.every((entry) => entry.synced)).toBe(true)
  })
})
