import type { UserRole } from '../../shared/domain/auth'
import type { Package } from '../../shared/domain/packages'

type RegisterPackageInput = {
  unitNumber: string
  photoUrl: string
  carrier?: string
  notes?: string
}

function randomId() {
  return `pkg-${crypto.randomUUID()}`
}

function isHeld(status: Package['status']) {
  return status === 'stored' || status === 'ready_for_pickup'
}

export function registerPackageTransition(
  packages: Package[],
  input: RegisterPackageInput,
  guardUserId: string
) {
  const unitNumber = input.unitNumber.trim()
  const photoUrl = input.photoUrl.trim()
  if (!unitNumber) {
    return { ok: false as const, error: 'Unidad obligatoria.' }
  }
  if (!photoUrl) {
    return { ok: false as const, error: 'Foto obligatoria.' }
  }

  const nextPackage: Package = {
    id: randomId(),
    unitNumber,
    photoUrl,
    carrier: input.carrier?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    status: 'stored',
    createdAt: new Date().toISOString(),
    storedByGuardUserId: guardUserId,
  }

  return {
    ok: true as const,
    nextPackages: [nextPackage, ...packages],
    created: nextPackage,
  }
}

export function markPackageReadyTransition(packages: Package[], packageId: string, userId: string) {
  let changed = false
  const nextPackages: Package[] = packages.map((entry): Package => {
    if (entry.id !== packageId) {
      return entry
    }
    if (entry.status !== 'stored') {
      return entry
    }
    changed = true
    return {
      ...entry,
      status: 'ready_for_pickup' as const,
      readyAt: new Date().toISOString(),
      readyByUserId: userId,
    }
  })

  if (!changed) {
    return {
      ok: false as const,
      error: 'Solo puedes confirmar recepcion cuando el paquete esta en resguardo.',
    }
  }

  return { ok: true as const, nextPackages }
}

export function deliverPackageTransition(
  packages: Package[],
  packageId: string,
  guardUserId: string
) {
  let changed = false
  const nextPackages: Package[] = packages.map((entry): Package => {
    if (entry.id !== packageId) {
      return entry
    }
    if (entry.status !== 'ready_for_pickup') {
      return entry
    }
    changed = true
    return {
      ...entry,
      status: 'delivered' as const,
      deliveredAt: new Date().toISOString(),
      deliveredByGuardUserId: guardUserId,
    }
  })

  if (!changed) {
    return {
      ok: false as const,
      error: 'No se puede entregar sin confirmacion previa del residente.',
    }
  }

  return { ok: true as const, nextPackages }
}

export function canRegisterOrDeliverPackage(role: UserRole) {
  return role === 'guard'
}

export function canMarkPackageReady(
  role: UserRole,
  packageUnitNumber: string,
  allowedUnitNumbers: string[]
) {
  if (!['resident', 'tenant'].includes(role)) {
    return false
  }
  return allowedUnitNumbers.includes(packageUnitNumber)
}

export function getHeldPackageCountForUnit(packages: Package[], unitNumber: string) {
  return packages.filter((entry) => entry.unitNumber === unitNumber && isHeld(entry.status)).length
}

export function getHeldPackageCountGlobal(packages: Package[]) {
  return packages.filter((entry) => isHeld(entry.status)).length
}

export function getHeldPackageCountForUnits(packages: Package[], unitNumbers: string[]) {
  return packages.filter((entry) => unitNumbers.includes(entry.unitNumber) && isHeld(entry.status))
    .length
}
