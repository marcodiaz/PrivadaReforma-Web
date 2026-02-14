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
import { getItem, migrateIfNeeded, removeItem, setItem, storageKeys } from '../storage/storage'
import {
  canResolveIncident,
  updateVote as updateIncidentVote,
} from '../../features/incidents/logic'
import { enqueueOfflineEvent, syncOfflineQueue } from '../../features/guard/offline'
import {
  buildDepartmentDisplayCode,
  findPassesByDepartmentSequence,
  getNextDepartmentSequence,
  normalizeDepartmentCode,
} from '../../features/access/qrLogic'
import { LOCAL_PACKAGES, packageSchema, type Package } from '../domain/packages'
import {
  canMarkPackageReady,
  canRegisterOrDeliverPackage,
  deliverPackageTransition,
  getHeldPackageCountForUnit as getHeldCountForUnit,
  getHeldPackageCountForUnits,
  getHeldPackageCountGlobal as getHeldCountGlobal,
  markPackageReadyTransition,
  registerPackageTransition,
} from '../../features/packages/logic'

type CreateQrInput = {
  label: string
  unitId: string
  departmentCode: string
  accessType: 'temporal' | 'time_limit'
  timeLimit?: 'week' | 'month' | 'permanent'
  visitorPhotoUrl?: string
}

type DemoDataContextValue = {
  accounts: LocalAccount[]
  session: AppSession | null
  incidents: Incident[]
  qrPasses: QrPass[]
  packages: Package[]
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
  resolveIncident: (
    incidentId: string,
    input?: { note?: string; photoUrl?: string }
  ) => { ok: boolean; message: string }
  createQrPass: (input: CreateQrInput) => { ok: boolean; error?: string }
  deleteQrPass: (qrId: string) => void
  handleGuardScanDecision: (input: {
    departmentCode: string
    sequenceCode: string
    result: 'allow' | 'reject'
    note?: string
  }) => { ok: boolean; message: string }
  enqueueManualOfflineValidation: (payload: {
    departmentCode: string
    sequenceCode: string
    result: 'allow' | 'reject'
    note?: string
  }) => void
  registerPackage: (input: {
    unitNumber: string
    photoUrl: string
    carrier?: string
    notes?: string
  }) => { ok: boolean; error?: string }
  markPackageReady: (packageId: string) => { ok: boolean; error?: string }
  deliverPackage: (packageId: string) => { ok: boolean; error?: string }
  getHeldPackageCountForUnit: (unitNumber: string) => number
  getHeldPackageCountForUser: (targetSession?: AppSession | null) => number
  getHeldPackageCountGlobal: () => number
  getPackagesForUser: (targetSession?: AppSession | null) => Package[]
}

const DemoDataContext = createContext<DemoDataContextValue | null>(null)

function safeReadArray<T>(
  key: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  fallback: T
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
    safeReadArray(storageKeys.incidents, incidentSchema.array(), LOCAL_INCIDENTS)
  )
  const [qrPasses, setQrPasses] = useState<QrPass[]>(() =>
    safeReadArray(storageKeys.qrPasses, qrPassSchema.array(), LOCAL_QR_PASSES)
  )
  const [packages, setPackages] = useState<Package[]>(() =>
    safeReadArray(storageKeys.packages, packageSchema.array(), LOCAL_PACKAGES)
  )
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() =>
    safeReadArray(storageKeys.auditLog, auditLogSchema.array(), LOCAL_AUDIT_LOG)
  )
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueEvent[]>(() =>
    safeReadArray(storageKeys.offlineQueue, offlineQueueSchema.array(), LOCAL_OFFLINE_QUEUE)
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
      setItem(storageKeys.packages, packages)
      setItem(storageKeys.auditLog, auditLog)
      setItem(storageKeys.offlineQueue, offlineQueue)
    }, 300)
    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
      }
    }
  }, [session, incidents, qrPasses, packages, auditLog, offlineQueue])

  function login(email: string, role: UserRole) {
    const fromAccount = LOCAL_ACCOUNTS.find(
      (account) => account.email === email && account.role === role
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
    setPackages(LOCAL_PACKAGES)
    setAuditLog(LOCAL_AUDIT_LOG)
    setOfflineQueue(LOCAL_OFFLINE_QUEUE)
    removeItem(storageKeys.session)
    removeItem(storageKeys.incidents)
    removeItem(storageKeys.qrPasses)
    removeItem(storageKeys.packages)
    removeItem(storageKeys.auditLog)
    removeItem(storageKeys.offlineQueue)
  }

  function dismissSyncToast() {
    setSyncToast(null)
  }

  function findAccountByRole(role: UserRole) {
    return LOCAL_ACCOUNTS.find((account) => account.role === role)
  }

  function getSessionUnitNumbers(targetSession?: AppSession | null) {
    const activeSession = targetSession ?? session
    if (!activeSession) {
      return []
    }

    const account = LOCAL_ACCOUNTS.find((entry) => entry.id === activeSession.userId)
    if (account?.unitId) {
      return [account.unitId]
    }
    return []
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
    setIncidents((previous) => updateIncidentVote(previous, incidentId, session.userId, newValue))
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
          : incident
      )
    )
  }

  function markIncidentInProgress(incidentId: string) {
    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId ? { ...incident, status: 'in_progress' } : incident
      )
    )
  }

  function addGuardAction(incidentId: string, input: { note?: string; photoUrl?: string }) {
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
          : incident
      )
    )
    return true
  }

  function resolveIncident(incidentId: string, input?: { note?: string; photoUrl?: string }) {
    let resolved = false
    let message = 'No se pudo resolver.'
    const cleanNote = input?.note?.trim()
    const cleanPhotoUrl = input?.photoUrl?.trim()

    setIncidents((previous) =>
      previous.map((incident) => {
        if (incident.id !== incidentId) {
          return incident
        }

        const nextGuardActions =
          cleanNote || cleanPhotoUrl
            ? [
                ...incident.guardActions,
                {
                  at: new Date().toISOString(),
                  note: cleanNote,
                  photoUrl: cleanPhotoUrl,
                },
              ]
            : incident.guardActions

        const candidate = { ...incident, guardActions: nextGuardActions }
        if (!canResolveIncident(candidate)) {
          message = 'Para terminar necesitas comentario o evidencia.'
          return incident
        }

        resolved = true
        message = 'Incidencia marcada como terminada.'
        return {
          ...candidate,
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
        }
      })
    )

    return { ok: resolved, message }
  }

  function createQrPass(input: CreateQrInput) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }
    if (debtMode) {
      return { ok: false, error: 'No se puede crear QR: modo adeudo activo.' }
    }

    const type = input.accessType === 'temporal' ? 'single_use' : 'time_window'
    const normalizedDepartment = normalizeDepartmentCode(input.departmentCode)
    if (!/^\d{4}$/.test(normalizedDepartment)) {
      return { ok: false, error: 'Departamento debe tener 4 digitos (ej. 1141).' }
    }
    if (!/[12]$/.test(normalizedDepartment)) {
      return {
        ok: false,
        error: 'El ultimo digito del departamento debe ser 1 o 2.',
      }
    }
    if (!qrPassTypeSchema.safeParse(type).success) {
      return { ok: false, error: 'Tipo de QR invalido.' }
    }

    const now = Date.now()
    let startAt: string | undefined
    let endAt: string | undefined
    if (type === 'time_window') {
      startAt = new Date(now).toISOString()
      if (input.timeLimit === 'week') {
        endAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
      } else if (input.timeLimit === 'month') {
        endAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
      } else if (input.timeLimit === 'permanent') {
        endAt = undefined
      } else {
        return { ok: false, error: 'Selecciona una vigencia para time limit.' }
      }
    } else {
      endAt = new Date(now + 3 * 60 * 60 * 1000).toISOString()
    }

    const needsPhoto =
      type === 'time_window' && (input.timeLimit === 'month' || input.timeLimit === 'permanent')
    if (needsPhoto && !input.visitorPhotoUrl?.trim()) {
      return {
        ok: false,
        error: 'Para 1 mes o permanente se requiere foto del visitante.',
      }
    }

    const pass: QrPass = {
      id: randomId('qr'),
      label: input.label.trim(),
      unitId: input.unitId.trim(),
      createdByUserId: session.userId,
      type,
      startAt,
      endAt,
      visitorPhotoUrl: input.visitorPhotoUrl?.trim(),
      status: 'active',
      qrValue: `QR-${crypto.randomUUID()}`,
      displayCode: buildDepartmentDisplayCode(
        normalizedDepartment,
        getNextDepartmentSequence(qrPasses, normalizedDepartment)
      ),
    }

    setQrPasses((previous) => [pass, ...previous])
    return { ok: true }
  }

  function deleteQrPass(qrId: string) {
    setQrPasses((previous) => previous.filter((pass) => pass.id !== qrId))
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
    departmentCode: string
    sequenceCode: string
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
    departmentCode: string
    sequenceCode: string
    result: 'allow' | 'reject'
    note?: string
  }) {
    const actor = session?.userId ?? 'guard-unknown'
    const normalizedDepartment = normalizeDepartmentCode(input.departmentCode)
    const normalizedSequence = input.sequenceCode.trim()
    if (!/^\d{4}$/.test(normalizedDepartment) || !/^\d{4}$/.test(normalizedSequence)) {
      return { ok: false, message: 'Departamento y numero deben tener 4 digitos.' }
    }

    if (!isOnline) {
      enqueueManualOfflineValidation(input)
      return { ok: true, message: 'Sin red: evento encolado para sincronizacion.' }
    }

    const matches = findPassesByDepartmentSequence(
      qrPasses,
      normalizedDepartment,
      normalizedSequence
    )
    const targetDisplayCode = `${normalizedDepartment}-${normalizedSequence}`
    if (matches.length === 0) {
      logAudit({
        actorUserId: actor,
        action: 'qr_scan_manual',
        targetId: targetDisplayCode,
        result: 'reject',
        note: 'Sin coincidencias',
      })
      return { ok: false, message: 'Codigo no encontrado.' }
    }
    if (matches.length > 1) {
      logAudit({
        actorUserId: actor,
        action: 'qr_scan_manual',
        targetId: targetDisplayCode,
        result: 'reject',
        note: 'Colision manual',
      })
      return {
        ok: false,
        message: 'Colision detectada: mas de un QR coincide con ese codigo.',
      }
    }

    const pass = matches[0]
    if (!pass) {
      return { ok: false, message: 'Codigo no encontrado.' }
    }

    const effectiveStatus = getEffectiveQrStatus(pass, new Date())
    if (effectiveStatus !== 'active') {
      logAudit({
        actorUserId: actor,
        action: 'qr_scan_manual',
        targetId: pass.id,
        result: 'reject',
        note: `QR en estado ${effectiveStatus}`,
      })
      return { ok: false, message: `QR no valido (${effectiveStatus}).` }
    }

    if (input.result === 'allow') {
      if (pass.type === 'single_use') {
        setQrPasses((previous) =>
          previous.map((entry) => (entry.id === pass.id ? { ...entry, status: 'used' } : entry))
        )
      }
      logAudit({
        actorUserId: actor,
        action: 'qr_scan_manual',
        targetId: pass.id,
        result: 'allow',
        note: input.note,
      })
      return { ok: true, message: 'Acceso permitido y auditado.' }
    }

    logAudit({
      actorUserId: actor,
      action: 'qr_scan_manual',
      targetId: pass.id,
      result: 'reject',
      note: input.note ?? 'Rechazado por guardia',
    })
    return { ok: true, message: 'Acceso rechazado y auditado.' }
  }

  function registerPackage(input: {
    unitNumber: string
    photoUrl: string
    carrier?: string
    notes?: string
  }) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }
    if (!canRegisterOrDeliverPackage(session.role)) {
      return { ok: false, error: 'Solo guardia puede registrar paquetes.' }
    }

    const result = registerPackageTransition(packages, input, session.userId)
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    setPackages(result.nextPackages)
    return { ok: true }
  }

  function markPackageReady(packageId: string) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }

    const target = packages.find((entry) => entry.id === packageId)
    if (!target) {
      return { ok: false, error: 'Paquete no encontrado.' }
    }

    const unitNumbers = getSessionUnitNumbers(session)
    if (!canMarkPackageReady(session.role, target.unitNumber, unitNumbers)) {
      return {
        ok: false,
        error: 'Solo residente/inquilino de la unidad puede confirmar recepcion.',
      }
    }

    const result = markPackageReadyTransition(packages, packageId, session.userId)
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    setPackages(result.nextPackages)
    return { ok: true }
  }

  function deliverPackage(packageId: string) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }
    if (!canRegisterOrDeliverPackage(session.role)) {
      return { ok: false, error: 'Solo guardia puede entregar paquetes.' }
    }

    const result = deliverPackageTransition(packages, packageId, session.userId)
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    setPackages(result.nextPackages)
    return { ok: true }
  }

  function getHeldPackageCountForUnit(unitNumber: string) {
    return getHeldCountForUnit(packages, unitNumber)
  }

  function getHeldPackageCountForUser(targetSession?: AppSession | null) {
    const activeSession = targetSession ?? session
    if (!activeSession) {
      return 0
    }
    if (['admin', 'board'].includes(activeSession.role)) {
      return getHeldCountGlobal(packages)
    }
    const units = getSessionUnitNumbers(activeSession)
    return getHeldPackageCountForUnits(packages, units)
  }

  function getHeldPackageCountGlobal() {
    return getHeldCountGlobal(packages)
  }

  function getPackagesForUser(targetSession?: AppSession | null) {
    const activeSession = targetSession ?? session
    if (!activeSession) {
      return []
    }
    if (['admin', 'board', 'guard'].includes(activeSession.role)) {
      return packages
    }
    const units = getSessionUnitNumbers(activeSession)
    return packages.filter((entry) => units.includes(entry.unitNumber))
  }

  const value: DemoDataContextValue = {
    accounts: LOCAL_ACCOUNTS,
    session,
    incidents,
    qrPasses,
    packages,
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
    deleteQrPass,
    handleGuardScanDecision,
    enqueueManualOfflineValidation,
    registerPackage,
    markPackageReady,
    deliverPackage,
    getHeldPackageCountForUnit,
    getHeldPackageCountForUser,
    getHeldPackageCountGlobal,
    getPackagesForUser,
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
