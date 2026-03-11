import type { UserRole } from './auth'

export type ModuleLifecycle = 'production_ready' | 'beta' | 'demo'

export type ModuleStatus = {
  id: string
  name: string
  lifecycle: ModuleLifecycle
  audience: UserRole[]
  summary: string
}

export type KnownModuleId = ModuleStatus['id']

export const moduleStatuses: ModuleStatus[] = [
  {
    id: 'visits',
    name: 'QR / Visitas',
    lifecycle: 'production_ready',
    audience: ['resident', 'tenant', 'guard', 'admin', 'board'],
    summary: 'Flujo principal de acceso con reglas, validacion y auditoria operativa.',
  },
  {
    id: 'guard',
    name: 'Operacion Guardia',
    lifecycle: 'production_ready',
    audience: ['guard', 'admin', 'board'],
    summary: 'Escaneo manual, entregas, bitacora y soporte offline.',
  },
  {
    id: 'packages',
    name: 'Paqueteria',
    lifecycle: 'production_ready',
    audience: ['resident', 'tenant', 'guard', 'admin', 'board'],
    summary: 'Registro, confirmacion y entrega con estatus claros.',
  },
  {
    id: 'incidents',
    name: 'Incidencias',
    lifecycle: 'production_ready',
    audience: ['resident', 'tenant', 'guard', 'admin', 'board'],
    summary: 'Reporte vecinal, SLA guardia y seguimiento operativo.',
  },
  {
    id: 'parking',
    name: 'Parking',
    lifecycle: 'production_ready',
    audience: ['resident', 'tenant', 'guard', 'admin', 'board'],
    summary: 'Reporte por cajon y atencion guardia con evidencia.',
  },
  {
    id: 'finance',
    name: 'Finanzas',
    lifecycle: 'beta',
    audience: ['resident', 'tenant', 'admin', 'board'],
    summary: 'Estado de cuenta y cierres periodicos con backend parcial.',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    lifecycle: 'beta',
    audience: ['resident', 'tenant', 'admin'],
    summary: 'Comunidad util, pero no prioritario para operacion critica.',
  },
  {
    id: 'pets',
    name: 'Mascotas',
    lifecycle: 'beta',
    audience: ['resident', 'tenant', 'admin'],
    summary: 'Funcionalidad social con valor comunitario y menor criticidad.',
  },
  {
    id: 'directory',
    name: 'Directorio',
    lifecycle: 'beta',
    audience: ['resident', 'tenant', 'admin'],
    summary: 'Util para residentes, pero fuera del camino critico operativo.',
  },
  {
    id: 'polls',
    name: 'Votaciones',
    lifecycle: 'beta',
    audience: ['resident', 'tenant', 'admin', 'board'],
    summary: 'Apoya decisiones vecinales, no operacion diaria.',
  },
]

export function getLifecycleLabel(lifecycle: ModuleLifecycle) {
  switch (lifecycle) {
    case 'production_ready':
      return 'Operable'
    case 'beta':
      return 'Beta'
    case 'demo':
    default:
      return 'Demo'
  }
}

export function getLifecycleBadgeClass(lifecycle: ModuleLifecycle) {
  switch (lifecycle) {
    case 'production_ready':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    case 'beta':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
    case 'demo':
    default:
      return 'border-slate-500/40 bg-slate-500/10 text-slate-200'
  }
}

export function getModulesForRole(role: UserRole | undefined) {
  if (!role) {
    return []
  }
  return moduleStatuses.filter((module) => module.audience.includes(role))
}

export function getModuleStatusById(id: string | undefined) {
  if (!id) {
    return null
  }
  return moduleStatuses.find((module) => module.id === id) ?? null
}

export function getModuleStatusForPath(pathname: string) {
  if (pathname.startsWith('/guard')) {
    if (pathname.startsWith('/guard/packages')) return getModuleStatusById('packages')
    if (pathname.startsWith('/guard/incidents')) return getModuleStatusById('incidents')
    if (pathname.startsWith('/guard/parking')) return getModuleStatusById('parking')
    return getModuleStatusById('guard')
  }
  if (pathname.startsWith('/app/visits')) return getModuleStatusById('visits')
  if (pathname.startsWith('/app/packages')) return getModuleStatusById('packages')
  if (pathname.startsWith('/app/incidents')) return getModuleStatusById('incidents')
  if (pathname.startsWith('/app/parking')) return getModuleStatusById('parking')
  if (pathname.startsWith('/app/marketplace')) return getModuleStatusById('marketplace')
  if (pathname.startsWith('/app/pets')) return getModuleStatusById('pets')
  if (pathname.startsWith('/app/directory')) return getModuleStatusById('directory')
  if (pathname.startsWith('/app/polls')) return getModuleStatusById('polls')
  if (pathname.startsWith('/app/finance') || pathname.startsWith('/admin/finance')) {
    return getModuleStatusById('finance')
  }
  return null
}
