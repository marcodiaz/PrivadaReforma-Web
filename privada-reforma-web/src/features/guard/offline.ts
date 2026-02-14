import type {
  AuditLogEntry,
  OfflineQueueEvent,
} from '../../shared/domain/demoData'

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
