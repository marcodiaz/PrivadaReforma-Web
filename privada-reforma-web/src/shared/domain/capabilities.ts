import type { UserRole } from './auth'

export type Capability =
  | 'access_admin_area'
  | 'access_guard_area'
  | 'access_resident_area'
  | 'manage_admin_users'
  | 'manage_push'
  | 'manage_finance'
  | 'moderate_community'
  | 'manage_guard_operations'
  | 'create_qr_pass'
  | 'manage_packages'
  | 'report_parking'
  | 'view_unit_packages'
  | 'view_operational_dashboard'

const roleCapabilities: Record<UserRole, Capability[]> = {
  resident: ['access_resident_area', 'create_qr_pass', 'report_parking', 'view_unit_packages'],
  tenant: ['access_resident_area', 'create_qr_pass', 'report_parking', 'view_unit_packages'],
  guard: ['access_guard_area', 'manage_guard_operations', 'manage_packages'],
  admin: [
    'access_admin_area',
    'access_resident_area',
    'manage_admin_users',
    'manage_push',
    'manage_finance',
    'moderate_community',
    'create_qr_pass',
    'report_parking',
    'view_unit_packages',
    'view_operational_dashboard',
  ],
  board: [
    'access_admin_area',
    'access_resident_area',
    'manage_finance',
    'moderate_community',
    'create_qr_pass',
    'report_parking',
    'view_unit_packages',
    'view_operational_dashboard',
  ],
}

export function hasCapability(role: UserRole | undefined, capability: Capability) {
  if (!role) {
    return false
  }
  return roleCapabilities[role].includes(capability)
}

export function canAccessAdminArea(role: UserRole | undefined) {
  return hasCapability(role, 'access_admin_area')
}

export function canAccessResidentArea(role: UserRole | undefined) {
  return hasCapability(role, 'access_resident_area')
}

export function canAccessGuardArea(role: UserRole | undefined) {
  return hasCapability(role, 'access_guard_area')
}

export function canManageAdminUsers(role: UserRole | undefined) {
  return hasCapability(role, 'manage_admin_users')
}

export function canManagePush(role: UserRole | undefined) {
  return hasCapability(role, 'manage_push')
}

export function canManageFinance(role: UserRole | undefined) {
  return hasCapability(role, 'manage_finance')
}

export function canModerateCommunity(role: UserRole | undefined) {
  return hasCapability(role, 'moderate_community')
}

export function canViewOperationalDashboard(role: UserRole | undefined) {
  return hasCapability(role, 'view_operational_dashboard') || hasCapability(role, 'manage_guard_operations')
}
