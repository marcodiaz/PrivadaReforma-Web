import { useEffect, useState } from 'react'

const STORAGE_KEY = 'operational_metrics_v1'
const WINDOW_EVENT = 'privada:operational-metrics-updated'

export type OperationalMetricType =
  | 'qr_created'
  | 'qr_scan_rejected'
  | 'qr_scan_allowed'
  | 'incident_created'
  | 'incident_resolved'
  | 'parking_report_created'
  | 'parking_report_resolved'
  | 'package_registered'
  | 'package_ready'
  | 'package_delivered'
  | 'offline_queue_enqueued'
  | 'sync_failed'
  | 'upload_error'
  | 'edge_function_error'

export type OperationalMetricEvent = {
  id: string
  type: OperationalMetricType
  at: string
  unitNumber?: string
  userId?: string
  metadata?: Record<string, string | number | boolean>
}

export type OperationalErrorCode =
  | 'validation_error'
  | 'permission_denied'
  | 'network_error'
  | 'sync_failed'
  | 'edge_function_error'
  | 'upload_error'
  | 'storage_error'
  | 'not_found'

export type OperationalError = {
  code: OperationalErrorCode
  message: string
  retryable: boolean
  auditContext?: Record<string, string | number | boolean>
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readEvents(): OperationalMetricEvent[] {
  if (!canUseStorage()) {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as OperationalMetricEvent[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEvents(events: OperationalMetricEvent[]) {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-250)))
  window.dispatchEvent(new CustomEvent(WINDOW_EVENT))
}

export function createOperationalError(input: OperationalError): OperationalError {
  return input
}

export function trackOperationalMetric(input: Omit<OperationalMetricEvent, 'id' | 'at'>) {
  if (!canUseStorage()) {
    return
  }
  const nextEvent: OperationalMetricEvent = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...input,
  }
  writeEvents([...readEvents(), nextEvent])
}

export function readOperationalMetrics(days = 30) {
  const now = Date.now()
  const cutoff = now - days * 24 * 60 * 60 * 1000
  const events = readEvents().filter((entry) => Date.parse(entry.at) >= cutoff)
  const counts = events.reduce<Record<OperationalMetricType, number>>(
    (accumulator, entry) => {
      accumulator[entry.type] = (accumulator[entry.type] ?? 0) + 1
      return accumulator
    },
    {
      qr_created: 0,
      qr_scan_rejected: 0,
      qr_scan_allowed: 0,
      incident_created: 0,
      incident_resolved: 0,
      parking_report_created: 0,
      parking_report_resolved: 0,
      package_registered: 0,
      package_ready: 0,
      package_delivered: 0,
      offline_queue_enqueued: 0,
      sync_failed: 0,
      upload_error: 0,
      edge_function_error: 0,
    },
  )

  return {
    events,
    counts,
    rejectionRate:
      counts.qr_scan_allowed + counts.qr_scan_rejected > 0
        ? counts.qr_scan_rejected / (counts.qr_scan_allowed + counts.qr_scan_rejected)
        : 0,
  }
}

export function useOperationalMetrics(days = 30) {
  const [snapshot, setSnapshot] = useState(() => readOperationalMetrics(days))

  useEffect(() => {
    const sync = () => setSnapshot(readOperationalMetrics(days))
    sync()
    window.addEventListener(WINDOW_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(WINDOW_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [days])

  return snapshot
}
