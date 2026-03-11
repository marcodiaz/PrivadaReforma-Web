import type {
  AppSession,
  FinancialMovement,
  Incident,
  OfflineQueueEvent,
  ParkingReport,
  QrPass,
  Reservation,
  UnitAccountEntry,
} from '../domain/demoData'
import type { Package } from '../domain/packages'
import type { ModuleStatus } from '../domain/moduleStatus'
import type { OperationalMetricEvent } from './operational'

export type OperationalInboxItem = {
  id: string
  title: string
  detail: string
  severity: 'high' | 'medium' | 'low'
}

export type AdminDashboardSnapshot = {
  activeVisitsToday: number
  heldPackages: number
  openIncidents: number
  overdueIncidents: number
  openParkingReports: number
  overdueUnitAccounts: number
  modulesByLifecycle: Record<ModuleStatus['lifecycle'], number>
  inbox: OperationalInboxItem[]
}

export type GuardInboxSnapshot = {
  activeDeliveries: number
  overdueIncidents: number
  openParkingReports: number
  offlineBacklog: number
  inbox: OperationalInboxItem[]
}

function isVisitActiveToday(pass: QrPass, now = new Date()) {
  if (pass.status !== 'active') {
    return false
  }
  if (!pass.startAt && !pass.endAt) {
    return false
  }
  const today = now.toISOString().slice(0, 10)
  const startsToday = pass.startAt?.slice(0, 10) === today
  const endsToday = pass.endAt?.slice(0, 10) === today
  return Boolean(startsToday || endsToday)
}

function getSlaDeadline(incident: Incident) {
  return Date.parse(incident.createdAt) + 15 * 60 * 1000
}

function countOverdueIncidents(incidents: Incident[], now = Date.now()) {
  return incidents.filter(
    (incident) => incident.status !== 'resolved' && getSlaDeadline(incident) < now,
  ).length
}

function countHeldPackages(packages: Package[]) {
  return packages.filter((entry) => entry.status !== 'delivered').length
}

function countOpenParkingReports(parkingReports: ParkingReport[]) {
  return parkingReports.filter((report) => report.status === 'open').length
}

function countOverdueUnitAccounts(entries: UnitAccountEntry[]) {
  return entries.filter((entry) => entry.status === 'overdue' && entry.direction === 'debit').length
}

function countOfflineBacklog(queue: OfflineQueueEvent[]) {
  return queue.filter((entry) => !entry.synced).length
}

function countActiveDeliveries(qrPasses: QrPass[], now = Date.now()) {
  return qrPasses.filter((pass) => {
    if (pass.type !== 'delivery_open' || pass.status !== 'active') {
      return false
    }
    if (!pass.endAt) {
      return true
    }
    const endsAt = Date.parse(pass.endAt)
    return Number.isNaN(endsAt) ? true : endsAt >= now
  }).length
}

function countOpenIncidents(incidents: Incident[]) {
  return incidents.filter((incident) => incident.status !== 'resolved').length
}

function countRecentFailures(events: OperationalMetricEvent[], type: OperationalMetricEvent['type']) {
  return events.filter((event) => event.type === type).length
}

export function buildAdminDashboardSnapshot(input: {
  qrPasses: QrPass[]
  packages: Package[]
  incidents: Incident[]
  parkingReports: ParkingReport[]
  unitAccountEntries: UnitAccountEntry[]
  moduleStatuses: ModuleStatus[]
  operationalEvents: OperationalMetricEvent[]
}) {
  const overdueIncidents = countOverdueIncidents(input.incidents)
  const openParkingReports = countOpenParkingReports(input.parkingReports)
  const inbox: OperationalInboxItem[] = []

  if (overdueIncidents > 0) {
    inbox.push({
      id: 'incidents-overdue',
      title: 'Incidencias fuera de SLA',
      detail: `${overdueIncidents} incidencias requieren respuesta inmediata.`,
      severity: 'high',
    })
  }
  if (openParkingReports > 0) {
    inbox.push({
      id: 'parking-open',
      title: 'Parking pendiente',
      detail: `${openParkingReports} reportes de parking siguen abiertos.`,
      severity: openParkingReports >= 3 ? 'high' : 'medium',
    })
  }
  const syncFailures = countRecentFailures(input.operationalEvents, 'sync_failed')
  if (syncFailures > 0) {
    inbox.push({
      id: 'sync-failures',
      title: 'Sincronizacion con fallas',
      detail: `${syncFailures} eventos locales no pudieron sincronizarse.`,
      severity: 'high',
    })
  }
  const edgeFunctionFailures = countRecentFailures(input.operationalEvents, 'edge_function_error')
  if (edgeFunctionFailures > 0) {
    inbox.push({
      id: 'edge-failures',
      title: 'Errores server-side',
      detail: `${edgeFunctionFailures} errores recientes en edge functions.`,
      severity: 'medium',
    })
  }

  return {
    activeVisitsToday: input.qrPasses.filter((pass) => isVisitActiveToday(pass)).length,
    heldPackages: countHeldPackages(input.packages),
    openIncidents: countOpenIncidents(input.incidents),
    overdueIncidents,
    openParkingReports,
    overdueUnitAccounts: countOverdueUnitAccounts(input.unitAccountEntries),
    modulesByLifecycle: input.moduleStatuses.reduce(
      (accumulator, module) => {
        accumulator[module.lifecycle] += 1
        return accumulator
      },
      { production_ready: 0, beta: 0, demo: 0 } as Record<ModuleStatus['lifecycle'], number>,
    ),
    inbox,
  } satisfies AdminDashboardSnapshot
}

export function buildGuardInboxSnapshot(input: {
  qrPasses: QrPass[]
  incidents: Incident[]
  parkingReports: ParkingReport[]
  offlineQueue: OfflineQueueEvent[]
  operationalEvents: OperationalMetricEvent[]
}) {
  const activeDeliveries = countActiveDeliveries(input.qrPasses)
  const overdueIncidents = countOverdueIncidents(input.incidents)
  const openParkingReports = countOpenParkingReports(input.parkingReports)
  const offlineBacklog = countOfflineBacklog(input.offlineQueue)
  const inbox: OperationalInboxItem[] = []

  if (overdueIncidents > 0) {
    inbox.push({
      id: 'guard-overdue-incidents',
      title: 'SLA vencido',
      detail: `${overdueIncidents} incidencias abiertas exceden 15 minutos.`,
      severity: 'high',
    })
  }
  if (offlineBacklog > 0) {
    inbox.push({
      id: 'guard-offline-backlog',
      title: 'Backlog offline',
      detail: `${offlineBacklog} eventos esperan sincronizacion.`,
      severity: offlineBacklog >= 5 ? 'high' : 'medium',
    })
  }
  if (activeDeliveries > 0) {
    inbox.push({
      id: 'guard-deliveries',
      title: 'Entregas activas',
      detail: `${activeDeliveries} entregas abiertas en caseta.`,
      severity: 'low',
    })
  }
  const uploadFailures = countRecentFailures(input.operationalEvents, 'upload_error')
  if (uploadFailures > 0) {
    inbox.push({
      id: 'guard-upload-errors',
      title: 'Errores de carga',
      detail: `${uploadFailures} errores recientes al subir evidencia.`,
      severity: 'medium',
    })
  }

  return {
    activeDeliveries,
    overdueIncidents,
    openParkingReports,
    offlineBacklog,
    inbox,
  } satisfies GuardInboxSnapshot
}

export function buildUnitTaskCenter(input: {
  session: AppSession | null
  qrPasses: QrPass[]
  packages: Package[]
  reservations: Reservation[]
  unitAccountEntries: UnitAccountEntry[]
  parkingReports: ParkingReport[]
  incidents: Incident[]
  financialMovements: FinancialMovement[]
}) {
  const unitNumber = input.session?.unitNumber?.trim()
  if (!unitNumber) {
    return {
      activeQr: 0,
      pendingPackages: 0,
      activeReservations: 0,
      overdueBalanceItems: 0,
      openParkingReports: 0,
      openIncidents: 0,
      latestMovementAt: undefined as string | undefined,
    }
  }

  return {
    activeQr: input.qrPasses.filter(
      (pass) => pass.status === 'active' && pass.unitId === unitNumber,
    ).length,
    pendingPackages: input.packages.filter(
      (pkg) => pkg.unitNumber === unitNumber && pkg.status !== 'delivered',
    ).length,
    activeReservations: input.reservations.filter(
      (reservation) => reservation.unitNumber === unitNumber && reservation.status === 'active',
    ).length,
    overdueBalanceItems: input.unitAccountEntries.filter(
      (entry) =>
        entry.unitNumber === unitNumber &&
        entry.status === 'overdue' &&
        entry.direction === 'debit',
    ).length,
    openParkingReports: input.parkingReports.filter(
      (report) => report.unitNumber === unitNumber && report.status === 'open',
    ).length,
    openIncidents: input.incidents.filter(
      (incident) => incident.unitNumber === unitNumber && incident.status !== 'resolved',
    ).length,
    latestMovementAt:
      input.financialMovements
        .filter((movement) => movement.unitNumber === unitNumber || movement.visibilityScope === 'community')
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0]?.occurredAt ?? undefined,
  }
}
