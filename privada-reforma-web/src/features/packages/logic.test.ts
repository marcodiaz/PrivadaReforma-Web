import { describe, expect, it } from 'vitest'
import {
  canMarkPackageReady,
  canRegisterOrDeliverPackage,
  deliverPackageTransition,
  markPackageReadyTransition,
} from './logic'
import type { Package } from '../../shared/domain/packages'

const basePackage: Package = {
  id: 'pkg-1',
  unitNumber: '1141',
  photoUrl: 'data:image/webp;base64,abc',
  status: 'stored',
  createdAt: '2026-01-01T10:00:00.000Z',
  storedByGuardUserId: 'acc-guard-1',
}

describe('packages transitions', () => {
  it("doesn't deliver directly from stored", () => {
    const result = deliverPackageTransition([basePackage], 'pkg-1', 'acc-guard-1')
    expect(result.ok).toBe(false)
  })

  it('delivers from ready_for_pickup', () => {
    const readyPackage: Package = {
      ...basePackage,
      status: 'ready_for_pickup',
      readyAt: '2026-01-01T10:05:00.000Z',
      readyByUserId: 'acc-resident-1',
    }
    const result = deliverPackageTransition([readyPackage], 'pkg-1', 'acc-guard-1')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.nextPackages[0]?.status).toBe('delivered')
    expect(result.nextPackages[0]?.deliveredByGuardUserId).toBe('acc-guard-1')
  })

  it('marks ready only once', () => {
    const first = markPackageReadyTransition([basePackage], 'pkg-1', 'acc-resident-1')
    expect(first.ok).toBe(true)
    if (!first.ok) {
      return
    }
    const second = markPackageReadyTransition(first.nextPackages, 'pkg-1', 'acc-resident-1')
    expect(second.ok).toBe(false)
  })
})

describe('packages rbac', () => {
  it('resident/tenant can mark ready for own unit only', () => {
    expect(canMarkPackageReady('resident', '1141', ['1141'])).toBe(true)
    expect(canMarkPackageReady('tenant', '1141', ['1141'])).toBe(true)
    expect(canMarkPackageReady('resident', '1142', ['1141'])).toBe(false)
  })

  it('guard can register/deliver but not mark ready', () => {
    expect(canRegisterOrDeliverPackage('guard')).toBe(true)
    expect(canMarkPackageReady('guard', '1141', ['1141'])).toBe(false)
  })
})
