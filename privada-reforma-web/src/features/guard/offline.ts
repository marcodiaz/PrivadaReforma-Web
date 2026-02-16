import type {
  AuditLogEntry,
  Incident,
  OfflineQueueEvent,
} from '../../shared/domain/demoData'
import type { Package } from '../../shared/domain/packages'

type OfflineFlushApi = {
  registerPackage: (pkg: Package) => Promise<boolean>
  markPackageReady: (packageId: string) => Promise<boolean>
  deliverPackage: (packageId: string) => Promise<boolean>
  createIncident: (incident: Incident) => Promise<boolean>
  voteIncident: (input: { incidentId: string; newValue: 1 | -1 }) => Promise<boolean>
  updateIncident: (incident: Incident) => Promise<boolean>
}

export function enqueueOfflineEvent(
  queue: OfflineQueueEvent[],
  nextEvent: OfflineQueueEvent,
) {
  return [...queue, nextEvent]
}

export function syncOfflineQueue(
  queue: OfflineQueueEvent[],
  auditLog: AuditLogEntry[],
): {
  nextQueue: OfflineQueueEvent[]
  nextAuditLog: AuditLogEntry[]
  syncedCount: number
} {
  const pending = queue.filter((event) => !event.synced)
  if (pending.length === 0) {
    return { nextQueue: queue, nextAuditLog: auditLog, syncedCount: 0 }
  }

  const syncedEvents = pending.map((event) => ({
    ...event,
    synced: true,
  }))

  const auditEntries: AuditLogEntry[] = pending.map((event) => ({
    id: `audit-${event.id}`,
    at: new Date().toISOString(),
    actorUserId: event.guardUserId,
    action: `offline:${event.type}`,
    targetId: String(event.payload.targetId ?? 'unknown'),
    result: 'synced',
    note: JSON.stringify(event.payload),
  }))

  const queueById = new Map(queue.map((event) => [event.id, event]))
  syncedEvents.forEach((event) => queueById.set(event.id, event))

  return {
    nextQueue: [...queueById.values()],
    nextAuditLog: [...auditLog, ...auditEntries],
    syncedCount: syncedEvents.length,
  }
}

function buildSyncedAuditEntry(event: OfflineQueueEvent): AuditLogEntry {
  return {
    id: `audit-${event.id}`,
    at: new Date().toISOString(),
    actorUserId: event.guardUserId,
    action: `offline:${event.type}`,
    targetId: String(event.payload.targetId ?? event.payload.incidentId ?? event.payload.packageId ?? 'unknown'),
    result: 'synced',
    note: JSON.stringify(event.payload),
  }
}

async function syncEvent(event: OfflineQueueEvent, api: OfflineFlushApi) {
  try {
    if (event.type === 'manual_qr_validation') {
      return true
    }
    if (event.type === 'package_register') {
      const payload = event.payload as { package: Package }
      return api.registerPackage(payload.package)
    }
    if (event.type === 'package_mark_ready') {
      const payload = event.payload as { packageId: string }
      return api.markPackageReady(payload.packageId)
    }
    if (event.type === 'package_deliver') {
      const payload = event.payload as { packageId: string }
      return api.deliverPackage(payload.packageId)
    }
    if (event.type === 'incident_create') {
      const payload = event.payload as { incident: Incident }
      return api.createIncident(payload.incident)
    }
    if (event.type === 'incident_vote') {
      const payload = event.payload as { incidentId: string; newValue: 1 | -1 }
      return api.voteIncident(payload)
    }
    if (event.type === 'incident_update') {
      const payload = event.payload as { incident: Incident }
      return api.updateIncident(payload.incident)
    }
    return false
  } catch {
    return false
  }
}

export async function flushOfflineQueueWithApi(
  queue: OfflineQueueEvent[],
  auditLog: AuditLogEntry[],
  api: OfflineFlushApi,
): Promise<{
  nextQueue: OfflineQueueEvent[]
  nextAuditLog: AuditLogEntry[]
  syncedCount: number
}> {
  const queueById = new Map(queue.map((event) => [event.id, event]))
  const nextAuditLog = [...auditLog]
  let syncedCount = 0

  for (const event of queue) {
    if (event.synced) {
      continue
    }
    const synced = await syncEvent(event, api)
    if (!synced) {
      continue
    }

    syncedCount += 1
    queueById.set(event.id, { ...event, synced: true })
    nextAuditLog.push(buildSyncedAuditEntry(event))
  }

  return {
    nextQueue: [...queueById.values()],
    nextAuditLog,
    syncedCount,
  }
}
