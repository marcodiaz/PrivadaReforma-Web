/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import type { UserRole } from '../domain/auth'
import {
  LOCAL_ACCOUNTS,
  LOCAL_AUDIT_LOG,
  LOCAL_INCIDENTS,
  LOCAL_OFFLINE_QUEUE,
  LOCAL_QR_PASSES,
  appSessionSchema,
  auditLogSchema,
  type AppSession,
  type AuditLogEntry,
  type Incident,
  incidentCategorySchema,
  incidentPrioritySchema,
  incidentSchema,
  type LocalAccount,
  offlineQueueSchema,
  type OfflineQueueEvent,
  qrPassSchema,
  type QrPass,
  qrPassTypeSchema,
} from '../domain/demoData'
import {
  migrateIfNeeded,
  getItem,
  removeItem,
  setItem,
  storageKeys,
} from '../storage/storage'
import { updateVote as updateIncidentVote, canResolveIncident } from '../../features/incidents/logic'
import { enqueueOfflineEvent, syncOfflineQueue } from '../../features/guard/offline'

type DemoDataContextValue = {
  accounts: LocalAccount[]
  session: AppSession | null
  incidents: Incident[]
  qrPasses: QrPass[]
  auditLog: AuditLogEntry[]
  offlineQueue: OfflineQueueEvent[]
  isOnline: boolean
  syncToast: string | null
  debtMode: boolean
  login: (email: string, role: UserRole) => void
  logout: () => void
  resetDemoData: () => void
  dismissSyncToast: () => void
  findAccountByRole: (role: UserRole) => LocalAccount | undefined
  createIncident: (input: {
    title: string
    description: string
    category: Incident['category']
    priority: Incident['priority']
  }) => boolean
  updateVote: (incidentId: string, newValue: 1 | -1) => void
  acknowledgeIncident: (incidentId: string) => void
  markIncidentInProgress: (incidentId: string) => void
  addGuardAction: (incidentId: string, input: { note?: string; photoUrl?: string }) => boolean
  resolveIncident: (incidentId: string) => boolean
  createQrPass: (input: {
    label: string
    unitId: string
    type: QrPass['type']
    startAt?: string
    endAt?: string
    visitorPhotoUrl?: string
  }) => { ok: boolean; error?: string }
  handleGuardScanDecision: (input: {
    qrValue: string
    result: 'allow' | 'reject'
    note?: string
  }) => { ok: boolean; message: string }
  enqueueManualOfflineValidation: (payload: {
    qrValue: string
    result: 'allow' | 'reject'
    note?: string
  }) => void
}

const DemoDataContext = createContext<DemoDataContextValue | null>(null)

function safeReadArray<T>(
  key: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  fallback: T,
) {
  const raw = getItem<unknown>(key)
  if (raw === null) {
    return fallback
  }
  const parsed = schema.safeParse(raw)
  return parsed.success && parsed.data ? parsed.data : fallback
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function buildSessionFromAccount(account: LocalAccount): AppSession {
  return {
    userId: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
  }
}

function getEffectiveQrStatus(pass: QrPass, now = new Date()): QrPass['status'] {
  if (pass.status !== 'active') {
    return pass.status
  }
  if (pass.type === 'time_window' && pass.endAt && new Date(pass.endAt) < now) {
    return 'expired'
  }
  return pass.status
}

export function DemoDataProvider({ children }: PropsWithChildren) {
  migrateIfNeeded()

  const [session, setSession] = useState<AppSession | null>(() => {
    const raw = getItem<unknown>(storageKeys.session)
    if (raw === null) {
      return null
    }
    const parsed = appSessionSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  })

  const [incidents, setIncidents] = useState<Incident[]>(() =>
    safeReadArray(storageKeys.incidents, incidentSchema.array(), LOCAL_INCIDENTS),
  )
  const [qrPasses, setQrPasses] = useState<QrPass[]>(() =>
    safeReadArray(storageKeys.qrPasses, qrPassSchema.array(), LOCAL_QR_PASSES),
  )
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() =>
    safeReadArray(storageKeys.auditLog, auditLogSchema.array(), LOCAL_AUDIT_LOG),
  )
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueEvent[]>(() =>
    safeReadArray(
      storageKeys.offlineQueue,
      offlineQueueSchema.array(),
      LOCAL_OFFLINE_QUEUE,
    ),
  )
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [syncToast, setSyncToast] = useState<string | null>(null)
  const [debtMode] = useState(false)
  const persistTimerRef = useRef<number | null>(null)
  const auditLogRef = useRef<AuditLogEntry[]>(auditLog)

  useEffect(() => {
    auditLogRef.current = auditLog
  }, [auditLog])

  useEffect(() => {
    function goOnline() {
      setIsOnline(true)
      setOfflineQueue((previousQueue) => {
        const result = syncOfflineQueue(previousQueue, auditLogRef.current)
        if (result.syncedCount > 0) {
          setAuditLog(result.nextAuditLog)
          setSyncToast(`${result.syncedCount} eventos sincronizados`)
        }
        return result.nextQueue
      })
    }

    function goOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current)
    }

    persistTimerRef.current = window.setTimeout(() => {
      if (session) {
        setItem(storageKeys.session, session)
      } else {
        removeItem(storageKeys.session)
      }
      setItem(storageKeys.incidents, incidents)
      setItem(storageKeys.qrPasses, qrPasses)
      setItem(storageKeys.auditLog, auditLog)
      setItem(storageKeys.offlineQueue, offlineQueue)
    }, 300)

    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
      }
    }
  }, [session, incidents, qrPasses, auditLog, offlineQueue])

  function login(email: string, role: UserRole) {
    const fromAccount = LOCAL_ACCOUNTS.find(
      (account) => account.email === email && account.role === role,
    )
    if (fromAccount) {
      setSession(buildSessionFromAccount(fromAccount))
      return
    }

    setSession({
      userId: randomId('session-user'),
      email,
      fullName: email.split('@')[0] ?? 'Usuario',
      role,
    })
  }

  function logout() {
    setSession(null)
  }

  function resetDemoData() {
    if (!import.meta.env.DEV) {
      return
    }
    setSession(null)
    setIncidents(LOCAL_INCIDENTS)
    setQrPasses(LOCAL_QR_PASSES)
    setAuditLog(LOCAL_AUDIT_LOG)
    setOfflineQueue(LOCAL_OFFLINE_QUEUE)
    removeItem(storageKeys.session)
    removeItem(storageKeys.incidents)
    removeItem(storageKeys.qrPasses)
    removeItem(storageKeys.auditLog)
    removeItem(storageKeys.offlineQueue)
  }

  function dismissSyncToast() {
    setSyncToast(null)
  }

  function findAccountByRole(role: UserRole) {
    return LOCAL_ACCOUNTS.find((account) => account.role === role)
  }

  function createIncident(input: {
    title: string
    description: string
    category: Incident['category']
    priority: Incident['priority']
  }) {
    if (!session) {
      return false
    }

    if (!incidentPrioritySchema.safeParse(input.priority).success) {
      return false
    }
    if (!incidentCategorySchema.safeParse(input.category).success) {
      return false
    }

    setIncidents((previous) => [
      {
        id: randomId('inc'),
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        priority: input.priority,
        createdAt: new Date().toISOString(),
        createdByUserId: session.userId,
        status: 'open',
        supportScore: 0,
        votes: [],
        guardActions: [],
      },
      ...previous,
    ])
    return true
  }

  function updateVote(incidentId: string, newValue: 1 | -1) {
    if (!session || !['resident', 'tenant'].includes(session.role)) {
      return
    }
    setIncidents((previous) =>
      updateIncidentVote(previous, incidentId, session.userId, newValue),
    )
  }

  function acknowledgeIncident(incidentId: string) {
    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              status: 'acknowledged',
              acknowledgedAt: incident.acknowledgedAt ?? new Date().toISOString(),
            }
          : incident,
      ),
    )
  }

  function markIncidentInProgress(incidentId: string) {
    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId ? { ...incident, status: 'in_progress' } : incident,
      ),
    )
  }

  function addGuardAction(
    incidentId: string,
    input: { note?: string; photoUrl?: string },
  ) {
    const cleanNote = input.note?.trim()
    const cleanPhotoUrl = input.photoUrl?.trim()
    if (!cleanNote && !cleanPhotoUrl) {
      return false
    }

    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              guardActions: [
                ...incident.guardActions,
                {
                  at: new Date().toISOString(),
                  note: cleanNote,
                  photoUrl: cleanPhotoUrl,
                },
              ],
            }
          : incident,
      ),
    )

    return true
  }

  function resolveIncident(incidentId: string) {
    const incident = incidents.find((entry) => entry.id === incidentId)
    if (!incident || !canResolveIncident(incident)) {
      return false
    }

    setIncidents((previous) =>
      previous.map((entry) =>
        entry.id === incidentId
          ? {
              ...entry,
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
            }
          : entry,
      ),
    )
    return true
  }

  function createQrPass(input: {
    label: string
    unitId: string
    type: QrPass['type']
    startAt?: string
    endAt?: string
    visitorPhotoUrl?: string
  }) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }
    if (debtMode) {
      return { ok: false, error: 'No se puede crear QR: modo adeudo activo.' }
    }
    if (!qrPassTypeSchema.safeParse(input.type).success) {
      return { ok: false, error: 'Tipo de QR invalido.' }
    }

    const isWindow = input.type === 'time_window'
    if (isWindow) {
      if (!input.startAt || !input.endAt) {
        return {
          ok: false,
          error: 'QR por ventana requiere fecha de inicio y fin.',
        }
      }
      const durationMs =
        new Date(input.endAt).getTime() - new Date(input.startAt).getTime()
      if (
        durationMs > 7 * 24 * 60 * 60 * 1000 &&
        !input.visitorPhotoUrl?.trim()
      ) {
        return {
          ok: false,
          error: 'Ventanas > 7 dias requieren foto del visitante.',
        }
      }
    }

    const pass: QrPass = {
      id: randomId('qr'),
      label: input.label.trim(),
      unitId: input.unitId.trim(),
      createdByUserId: session.userId,
      type: input.type,
      startAt: input.startAt,
      endAt: input.endAt,
      visitorPhotoUrl: input.visitorPhotoUrl?.trim(),
      status: 'active',
      qrValue: `QR-${crypto.randomUUID()}`,
      displayCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
    }
    setQrPasses((previous) => [pass, ...previous])
    return { ok: true }
  }

  function logAudit(entry: Omit<AuditLogEntry, 'id' | 'at'>) {
    setAuditLog((previous) => [
      ...previous,
      {
        id: randomId('audit'),
        at: new Date().toISOString(),
        ...entry,
      },
    ])
  }

  function enqueueManualOfflineValidation(payload: {
    qrValue: string
    result: 'allow' | 'reject'
    note?: string
  }) {
    if (!session) {
      return
    }

    const event: OfflineQueueEvent = {
      id: randomId('offline'),
      at: new Date().toISOString(),
      type: 'manual_qr_validation',
      payload,
      guardUserId: session.userId,
      synced: false,
    }
    setOfflineQueue((previous) => enqueueOfflineEvent(previous, event))
  }

  function handleGuardScanDecision(input: {
    qrValue: string
    result: 'allow' | 'reject'
    note?: string
  }) {
    const actor = session?.userId ?? 'guard-unknown'

    if (!isOnline) {
      enqueueManualOfflineValidation(input)
      return {
        ok: true,
        message: 'Sin red: evento enviado a offlineQueue para sincronizar.',
      }
    }

    const pass = qrPasses.find((entry) => entry.qrValue === input.qrValue.trim())
    if (!pass) {
      logAudit({
        actorUserId: actor,
        action: 'qr_scan',
        targetId: input.qrValue,
        result: 'reject',
        note: 'QR no encontrado',
      })
      return { ok: false, message: 'QR no encontrado.' }
    }

    const effectiveStatus = getEffectiveQrStatus(pass, new Date())
    if (effectiveStatus !== 'active') {
      logAudit({
        actorUserId: actor,
        action: 'qr_scan',
        targetId: pass.id,
        result: 'reject',
        note: `QR en estado ${effectiveStatus}`,
      })
      return { ok: false, message: `QR no valido (${effectiveStatus}).` }
    }

    if (input.result === 'allow') {
      if (pass.type === 'single_use') {
        setQrPasses((previous) =>
          previous.map((entry) =>
            entry.id === pass.id ? { ...entry, status: 'used' } : entry,
          ),
        )
      }
      logAudit({
        actorUserId: actor,
        action: 'qr_scan',
        targetId: pass.id,
        result: 'allow',
        note: input.note,
      })
      return { ok: true, message: 'Acceso permitido y auditado.' }
    }

    logAudit({
      actorUserId: actor,
      action: 'qr_scan',
      targetId: pass.id,
      result: 'reject',
      note: input.note ?? 'Rechazado por guardia',
    })
    return { ok: true, message: 'Acceso rechazado y auditado.' }
  }

  const value: DemoDataContextValue = {
    accounts: LOCAL_ACCOUNTS,
    session,
    incidents,
    qrPasses,
    auditLog,
    offlineQueue,
    isOnline,
    syncToast,
    debtMode,
    login,
    logout,
    resetDemoData,
    dismissSyncToast,
    findAccountByRole,
    createIncident,
    updateVote,
    acknowledgeIncident,
    markIncidentInProgress,
    addGuardAction,
    resolveIncident,
    createQrPass,
    handleGuardScanDecision,
    enqueueManualOfflineValidation,
  }

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>
}

export function useDemoData() {
  const context = useContext(DemoDataContext)
  if (!context) {
    throw new Error('useDemoData must be used within DemoDataProvider')
  }

  return context
}
