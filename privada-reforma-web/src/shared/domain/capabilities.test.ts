import { describe, expect, it } from 'vitest'
import {
  canAccessAdminArea,
  canAccessGuardArea,
  canAccessResidentArea,
  canManageAdminUsers,
  canManageFinance,
  canModerateCommunity,
} from './capabilities'

describe('capabilities', () => {
  it('grants admin-area access only to admin/board', () => {
    expect(canAccessAdminArea('admin')).toBe(true)
    expect(canAccessAdminArea('board')).toBe(true)
    expect(canAccessAdminArea('resident')).toBe(false)
    expect(canAccessAdminArea('guard')).toBe(false)
  })

  it('keeps guard area scoped to guard role', () => {
    expect(canAccessGuardArea('guard')).toBe(true)
    expect(canAccessGuardArea('admin')).toBe(false)
  })

  it('allows residents, tenants, admin and board into app area', () => {
    expect(canAccessResidentArea('resident')).toBe(true)
    expect(canAccessResidentArea('tenant')).toBe(true)
    expect(canAccessResidentArea('admin')).toBe(true)
    expect(canAccessResidentArea('board')).toBe(true)
    expect(canAccessResidentArea('guard')).toBe(false)
  })

  it('separates admin-only management from board capabilities', () => {
    expect(canManageAdminUsers('admin')).toBe(true)
    expect(canManageAdminUsers('board')).toBe(false)
    expect(canManageFinance('board')).toBe(true)
    expect(canModerateCommunity('board')).toBe(true)
  })
})
