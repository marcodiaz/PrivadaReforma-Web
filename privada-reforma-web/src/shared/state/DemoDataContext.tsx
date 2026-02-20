/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  LOCAL_AUDIT_LOG,
  LOCAL_INCIDENTS,
  LOCAL_OFFLINE_QUEUE,
  LOCAL_PARKING_REPORTS,
  LOCAL_PET_POSTS,
  LOCAL_POLLS,
  LOCAL_QR_PASSES,
  LOCAL_RESERVATIONS,
  auditLogSchema,
  type AppSession,
  type AuditLogEntry,
  type Incident,
  petPostSchema,
  type PetPost,
  pollSchema,
  type Poll,
  parkingReportSchema,
  type ParkingReport,
  incidentCategorySchema,
  incidentPrioritySchema,
  incidentSchema,
  offlineQueueSchema,
  type OfflineQueueEvent,
  qrPassSchema,
  type QrPass,
  qrPassTypeSchema,
  reservationSchema,
  type Reservation,
} from '../domain/demoData'
import { getItem, migrateIfNeeded, removeItem, setItem, storageKeys } from '../storage/storage'
import {
  createIncidentInSupabase,
  createPetPostInSupabase,
  createPollInSupabase,
  deletePollInSupabase,
  deliverPackageInSupabase,
  endPollInSupabase,
  fetchIncidentsFromSupabase,
  fetchPackagesFromSupabase,
  fetchPetPostsFromSupabase,
  fetchPollsFromSupabase,
  markPackageReadyInSupabase,
  registerPackageInSupabase,
  updateIncidentInSupabase,
  votePollInSupabase,
  voteIncidentInSupabase,
} from '../supabase/data'
import { isSupabaseConfigured } from '../supabase/client'
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider'
import {
  canResolveIncident,
  updateVote as updateIncidentVote,
} from '../../features/incidents/logic'
import { enqueueOfflineEvent, flushOfflineQueueWithApi } from '../../features/guard/offline'
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
  visitorName?: string
  maxUses?: number
  maxPersons?: number
  accessMessage?: string
  accessType: 'temporal' | 'time_limit'
  timeLimit?: 'week' | 'month' | 'permanent'
  visitorPhotoUrl?: string
}

type DemoDataContextValue = {
  session: AppSession | null
  authLoading: boolean
  incidents: Incident[]
  qrPasses: QrPass[]
  packages: Package[]
  auditLog: AuditLogEntry[]
  reservations: Reservation[]
  parkingReports: ParkingReport[]
  polls: Poll[]
  petPosts: PetPost[]
  offlineQueue: OfflineQueueEvent[]
  isOnline: boolean
  syncToast: string | null
  debtMode: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  resetDemoData: () => void
  dismissSyncToast: () => void
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
  createReservation: (input: { amenity: string; reservationDate: string }) => {
    ok: boolean
    error?: string
  }
  getActiveReservations: () => Reservation[]
  createPoll: (input: { title: string; options: string[]; durationDays: number }) => {
    ok: boolean
    error?: string
  }
  votePoll: (pollId: string, optionId: string) => { ok: boolean; error?: string }
  endPoll: (pollId: string) => { ok: boolean; error?: string }
  deletePoll: (pollId: string) => { ok: boolean; error?: string }
  createPetPost: (input: { petName: string; photoUrl: string; comments: string }) => {
    ok: boolean
    error?: string
  }
  createParkingReport: (input: { description: string }) => { ok: boolean; error?: string }
  updateParkingReportStatus: (input: {
    reportId: string
    status: 'owner_notified' | 'tow_truck_notified'
    guardNote?: string
  }) => { ok: boolean; error?: string }
  getAssignedParkingForUnit: (unitNumber?: string) => string
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
const REMOTE_BOOTSTRAP_TIMEOUT_MS = 6_000

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
    promise
      .then((value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      })
  })
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

function isFridayOrSaturday(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) {
    return false
  }
  const day = date.getDay()
  return day === 5 || day === 6
}

function getAssignedParkingForUnit(unitNumber?: string) {
  const normalized = (unitNumber ?? '').trim().toUpperCase()
  if (!normalized) {
    return 'E-SIN-DEPTO'
  }
  return `E-${normalized.replace(/\s+/g, '')}`
}

function isReservationActive(reservation: Reservation, now = new Date()) {
  if (reservation.status !== 'active') {
    return false
  }
  const reservationDate = new Date(`${reservation.reservationDate}T23:59:59`)
  if (Number.isNaN(reservationDate.getTime())) {
    return false
  }
  return reservationDate >= now
}

function isPollClosed(poll: Poll, now = new Date()) {
  if (poll.endedAt) {
    return true
  }
  if (poll.endsAt) {
    const endsAt = new Date(poll.endsAt)
    if (!Number.isNaN(endsAt.getTime()) && endsAt < now) {
      return true
    }
  }
  return false
}

export function DemoDataProvider({ children }: PropsWithChildren) {
  migrateIfNeeded()
  const {
    session,
    isLoading: authLoading,
    signInWithPassword,
    signOut,
  } = useSupabaseAuth()

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
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    safeReadArray(storageKeys.reservations, reservationSchema.array(), LOCAL_RESERVATIONS)
  )
  const [parkingReports, setParkingReports] = useState<ParkingReport[]>(() =>
    safeReadArray(storageKeys.parkingReports, parkingReportSchema.array(), LOCAL_PARKING_REPORTS)
  )
  const [polls, setPolls] = useState<Poll[]>(() =>
    safeReadArray(storageKeys.polls, pollSchema.array(), LOCAL_POLLS)
  )
  const [petPosts, setPetPosts] = useState<PetPost[]>(() =>
    safeReadArray(storageKeys.petPosts, petPostSchema.array(), LOCAL_PET_POSTS)
  )
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueEvent[]>(() =>
    safeReadArray(storageKeys.offlineQueue, offlineQueueSchema.array(), LOCAL_OFFLINE_QUEUE)
  )
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [syncToast, setSyncToast] = useState<string | null>(null)
  const [debtMode] = useState(false)
  const persistTimerRef = useRef<number | null>(null)
  const remoteLoadDoneRef = useRef(false)
  const flushingOfflineQueueRef = useRef(false)
  const auditLogRef = useRef<AuditLogEntry[]>(auditLog)

  useEffect(() => {
    auditLogRef.current = auditLog
  }, [auditLog])

  useEffect(() => {
    function goOnline() {
      setIsOnline(true)
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
    remoteLoadDoneRef.current = false
  }, [session?.userId])

  useEffect(() => {
    if (!session || !isSupabaseConfigured || !isOnline || remoteLoadDoneRef.current) {
      return
    }

    remoteLoadDoneRef.current = true
    let isMounted = true

    void (async () => {
      const loadPackages = withTimeout(
        fetchPackagesFromSupabase({ role: session.role, unitNumber: session.unitNumber }),
        REMOTE_BOOTSTRAP_TIMEOUT_MS,
        'packages'
      )
        .then((remotePackages) => {
          if (!isMounted || !remotePackages) {
            return
          }
          setPackages(remotePackages)
        })
        .catch(() => undefined)

      const loadIncidents = withTimeout(
        fetchIncidentsFromSupabase({ role: session.role, unitNumber: session.unitNumber }),
        REMOTE_BOOTSTRAP_TIMEOUT_MS,
        'incidents'
      )
        .then((remoteIncidents) => {
          if (!isMounted || !remoteIncidents) {
            return
          }
          setIncidents(remoteIncidents)
        })
        .catch(() => undefined)

      const loadPolls = withTimeout(fetchPollsFromSupabase(), REMOTE_BOOTSTRAP_TIMEOUT_MS, 'polls')
        .then((remotePolls) => {
          if (!isMounted || !remotePolls) {
            return
          }
          setPolls(remotePolls)
        })
        .catch(() => undefined)

      const loadPets = withTimeout(
        fetchPetPostsFromSupabase(),
        REMOTE_BOOTSTRAP_TIMEOUT_MS,
        'pet_posts'
      )
        .then((remotePetPosts) => {
          if (!isMounted || !remotePetPosts) {
            return
          }
          setPetPosts(remotePetPosts)
        })
        .catch(() => undefined)

      await Promise.allSettled([loadPackages, loadIncidents, loadPolls, loadPets])
    })()

    return () => {
      isMounted = false
    }
  }, [isOnline, session])

  useEffect(() => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current)
    }
    persistTimerRef.current = window.setTimeout(() => {
      setItem(storageKeys.incidents, incidents)
      setItem(storageKeys.qrPasses, qrPasses)
      setItem(storageKeys.packages, packages)
      setItem(storageKeys.auditLog, auditLog)
      setItem(storageKeys.offlineQueue, offlineQueue)
      setItem(storageKeys.reservations, reservations)
      setItem(storageKeys.parkingReports, parkingReports)
      setItem(storageKeys.polls, polls)
      setItem(storageKeys.petPosts, petPosts)
    }, 300)
    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
      }
    }
  }, [incidents, qrPasses, packages, auditLog, offlineQueue, reservations, parkingReports, polls, petPosts])

  useEffect(() => {
    if (!isOnline || !session || !isSupabaseConfigured || flushingOfflineQueueRef.current) {
      return
    }
    if (!offlineQueue.some((entry) => !entry.synced)) {
      return
    }

    flushingOfflineQueueRef.current = true
    void (async () => {
      const result = await flushOfflineQueueWithApi(offlineQueue, auditLogRef.current, {
        registerPackage: registerPackageInSupabase,
        markPackageReady: markPackageReadyInSupabase,
        deliverPackage: deliverPackageInSupabase,
        createIncident: createIncidentInSupabase,
        voteIncident: voteIncidentInSupabase,
        updateIncident: updateIncidentInSupabase,
      })
      setOfflineQueue(result.nextQueue)
      if (result.syncedCount > 0) {
        setAuditLog(result.nextAuditLog)
        setSyncToast(`${result.syncedCount} eventos sincronizados`)
      }
      flushingOfflineQueueRef.current = false
    })()
  }, [isOnline, offlineQueue, session])

  async function login(email: string, password: string) {
    return signInWithPassword(email, password)
  }

  async function logout() {
    try {
      await signOut()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.info('[auth] logout fallback after signOut error', error)
      }
    }
  }

  function resetDemoData() {
    if (!import.meta.env.DEV) {
      return
    }
    setIncidents(LOCAL_INCIDENTS)
    setQrPasses(LOCAL_QR_PASSES)
    setPackages(LOCAL_PACKAGES)
    setAuditLog(LOCAL_AUDIT_LOG)
    setOfflineQueue(LOCAL_OFFLINE_QUEUE)
    setReservations(LOCAL_RESERVATIONS)
    setParkingReports(LOCAL_PARKING_REPORTS)
    setPolls(LOCAL_POLLS)
    setPetPosts(LOCAL_PET_POSTS)
    removeItem(storageKeys.incidents)
    removeItem(storageKeys.qrPasses)
    removeItem(storageKeys.packages)
    removeItem(storageKeys.auditLog)
    removeItem(storageKeys.offlineQueue)
    removeItem(storageKeys.reservations)
    removeItem(storageKeys.parkingReports)
    removeItem(storageKeys.polls)
    removeItem(storageKeys.petPosts)
  }

  function dismissSyncToast() {
    setSyncToast(null)
  }

  function enqueueDomainEvent(type: string, payload: Record<string, unknown>) {
    if (!session) {
      return
    }
    const event: OfflineQueueEvent = {
      id: randomId('offline'),
      at: new Date().toISOString(),
      type,
      payload,
      guardUserId: session.userId,
      synced: false,
    }
    setOfflineQueue((previous) => enqueueOfflineEvent(previous, event))
  }

  function getSessionUnitNumbers(targetSession?: AppSession | null) {
    const activeSession = targetSession ?? session
    if (!activeSession) {
      return []
    }

    if (activeSession.unitNumber?.trim()) {
      return [activeSession.unitNumber]
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
    const nextIncident: Incident = {
      id: randomId('inc'),
      unitNumber: session.unitNumber,
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
    }
    setIncidents((previous) => [nextIncident, ...previous])

    if (isSupabaseConfigured) {
      if (!isOnline) {
        enqueueDomainEvent('incident_create', { incident: nextIncident })
      } else {
        void createIncidentInSupabase(nextIncident).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('incident_create', { incident: nextIncident })
          }
        })
      }
    }
    return true
  }

  function updateVote(incidentId: string, newValue: 1 | -1) {
    if (!session) {
      return
    }
    setIncidents((previous) => updateIncidentVote(previous, incidentId, session.userId, newValue))
    if (isSupabaseConfigured) {
      if (!isOnline) {
        enqueueDomainEvent('incident_vote', { incidentId, newValue })
      } else {
        void voteIncidentInSupabase({ incidentId, newValue }).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('incident_vote', { incidentId, newValue })
          }
        })
      }
    }
  }

  function acknowledgeIncident(incidentId: string) {
    let nextIncident: Incident | null = null
    setIncidents((previous) => {
      const next = previous.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              status: 'acknowledged' as const,
              acknowledgedAt: incident.acknowledgedAt ?? new Date().toISOString(),
            }
          : incident
      )
      nextIncident = next.find((entry) => entry.id === incidentId) ?? null
      return next
    })
    if (nextIncident && isSupabaseConfigured) {
      if (!isOnline) {
        enqueueDomainEvent('incident_update', { incident: nextIncident })
      } else {
        void updateIncidentInSupabase(nextIncident).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('incident_update', { incident: nextIncident })
          }
        })
      }
    }
  }

  function markIncidentInProgress(incidentId: string) {
    let nextIncident: Incident | null = null
    setIncidents((previous) => {
      const next = previous.map((incident) =>
        incident.id === incidentId ? { ...incident, status: 'in_progress' as const } : incident
      )
      nextIncident = next.find((entry) => entry.id === incidentId) ?? null
      return next
    })
    if (nextIncident && isSupabaseConfigured) {
      if (!isOnline) {
        enqueueDomainEvent('incident_update', { incident: nextIncident })
      } else {
        void updateIncidentInSupabase(nextIncident).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('incident_update', { incident: nextIncident })
          }
        })
      }
    }
  }

  function addGuardAction(incidentId: string, input: { note?: string; photoUrl?: string }) {
    const cleanNote = input.note?.trim()
    const cleanPhotoUrl = input.photoUrl?.trim()
    if (!cleanNote && !cleanPhotoUrl) {
      return false
    }
    let nextIncident: Incident | null = null
    setIncidents((previous) => {
      const next = previous.map((incident) =>
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
      nextIncident = next.find((entry) => entry.id === incidentId) ?? null
      return next
    })
    if (nextIncident && isSupabaseConfigured) {
      if (!isOnline) {
        enqueueDomainEvent('incident_update', { incident: nextIncident })
      } else {
        void updateIncidentInSupabase(nextIncident).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('incident_update', { incident: nextIncident })
          }
        })
      }
    }
    return true
  }

  function resolveIncident(incidentId: string, input?: { note?: string; photoUrl?: string }) {
    let resolved = false
    let message = 'No se pudo resolver.'
    const cleanNote = input?.note?.trim()
    const cleanPhotoUrl = input?.photoUrl?.trim()

    let nextIncident: Incident | null = null
    setIncidents((previous) => {
      const next = previous.map((incident) => {
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
          status: 'resolved' as const,
          resolvedAt: new Date().toISOString(),
        }
      })
      nextIncident = next.find((entry) => entry.id === incidentId) ?? null
      return next
    })

    if (resolved && nextIncident && isSupabaseConfigured) {
      if (!isOnline) {
        enqueueDomainEvent('incident_update', { incident: nextIncident })
      } else {
        void updateIncidentInSupabase(nextIncident).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('incident_update', { incident: nextIncident })
          }
        })
      }
    }

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
    const normalizedDepartment = normalizeDepartmentCode(session.unitNumber ?? '')
    if (!/^\d{4}$/.test(normalizedDepartment)) {
      return { ok: false, error: 'Tu cuenta no tiene un departamento valido de 4 digitos.' }
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

    const pass: QrPass = {
      id: randomId('qr'),
      label: input.label.trim(),
      unitId: input.unitId.trim(),
      createdByUserId: session.userId,
      visitorName: input.visitorName?.trim() || 'VISITA',
      maxUses: input.maxUses && input.maxUses > 0 ? Math.floor(input.maxUses) : 1,
      maxPersons: input.maxPersons && input.maxPersons > 0 ? Math.floor(input.maxPersons) : 1,
      accessMessage: input.accessMessage?.trim(),
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

  function createReservation(input: { amenity: string; reservationDate: string }) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }
    if (!['resident', 'tenant', 'board', 'admin'].includes(session.role)) {
      return { ok: false, error: 'Solo residentes/comite pueden reservar.' }
    }
    if (!session.unitNumber?.trim()) {
      return { ok: false, error: 'Tu cuenta no tiene departamento asignado.' }
    }
    if (!isFridayOrSaturday(input.reservationDate)) {
      return { ok: false, error: 'Solo se permite reservar viernes o sabado.' }
    }
    const amenity = input.amenity.trim()
    if (!amenity) {
      return { ok: false, error: 'Selecciona una amenidad.' }
    }

    const alreadyBooked = reservations.some(
      (reservation) =>
        reservation.status === 'active' &&
        reservation.amenity.toLowerCase() === amenity.toLowerCase() &&
        reservation.reservationDate === input.reservationDate
    )
    if (alreadyBooked) {
      return {
        ok: false,
        error: 'La amenidad ya tiene una reservacion activa para esa fecha.',
      }
    }

    const nextReservation: Reservation = {
      id: randomId('res'),
      unitNumber: session.unitNumber,
      amenity,
      reservationDate: input.reservationDate,
      fee: 5000,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdByUserId: session.userId,
    }
    setReservations((previous) =>
      [...previous, nextReservation].sort((a, b) =>
        a.reservationDate.localeCompare(b.reservationDate)
      )
    )
    return { ok: true }
  }

  function getActiveReservations() {
    return reservations.filter((reservation) => isReservationActive(reservation))
  }

  function createPoll(input: { title: string; options: string[]; durationDays: number }) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }

    const title = input.title.trim()
    if (!title) {
      return { ok: false, error: 'Titulo obligatorio.' }
    }

    const normalizedOptions = input.options
      .map((option) => option.trim())
      .filter((option) => option.length > 0)
    const uniqueOptions = Array.from(new Set(normalizedOptions))
    if (uniqueOptions.length < 2) {
      return { ok: false, error: 'Agrega al menos 2 opciones.' }
    }
    if (!Number.isInteger(input.durationDays) || input.durationDays < 1 || input.durationDays > 7) {
      return { ok: false, error: 'La duracion debe ser entre 1 y 7 dias.' }
    }

    const createdAt = new Date()
    const endsAt = new Date(createdAt.getTime() + input.durationDays * 24 * 60 * 60 * 1000)

    const poll: Poll = {
      id: randomId('poll'),
      title,
      options: uniqueOptions.map((label, index) => ({
        id: `opt-${index + 1}`,
        label,
      })),
      votes: [],
      createdAt: createdAt.toISOString(),
      endsAt: endsAt.toISOString(),
      createdByUserId: session.userId,
      createdByName: session.fullName,
    }

    setPolls((previous) => [poll, ...previous])
    if (isSupabaseConfigured && isOnline) {
      void createPollInSupabase(poll)
    }
    return { ok: true }
  }

  function votePoll(pollId: string, optionId: string) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }

    let updated = false
    setPolls((previous) =>
      previous.map((poll) => {
        if (poll.id !== pollId) {
          return poll
        }
        const optionExists = poll.options.some((option) => option.id === optionId)
        if (!optionExists) {
          return poll
        }
        if (isPollClosed(poll)) {
          return poll
        }
        updated = true
        const withoutMyVote = poll.votes.filter((vote) => vote.userId !== session.userId)
        return {
          ...poll,
          votes: [
            ...withoutMyVote,
            {
              userId: session.userId,
              userName: session.fullName,
              optionId,
              votedAt: new Date().toISOString(),
            },
          ],
        }
      })
    )

    if (!updated) {
      return { ok: false, error: 'Votacion cerrada o no encontrada.' }
    }
    if (isSupabaseConfigured && isOnline) {
      void votePollInSupabase({ pollId, optionId })
    }
    return { ok: true }
  }

  function endPoll(pollId: string) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }
    const target = polls.find((poll) => poll.id === pollId)
    if (!target) {
      return { ok: false, error: 'Votacion no encontrada.' }
    }
    if (target.createdByUserId !== session.userId && session.role !== 'admin') {
      return { ok: false, error: 'Solo el creador o admin puede terminar votaciones.' }
    }
    const endedAt = new Date().toISOString()
    setPolls((previous) =>
      previous.map((poll) => (poll.id === pollId ? { ...poll, endedAt } : poll))
    )
    if (isSupabaseConfigured && isOnline) {
      void endPollInSupabase({ pollId, endedAt })
    }
    return { ok: true }
  }

  function deletePoll(pollId: string) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }
    const target = polls.find((poll) => poll.id === pollId)
    if (!target) {
      return { ok: false, error: 'Votacion no encontrada.' }
    }
    if (target.createdByUserId !== session.userId && session.role !== 'admin') {
      return { ok: false, error: 'Solo el creador o admin puede eliminar votaciones.' }
    }
    setPolls((previous) => previous.filter((poll) => poll.id !== pollId))
    if (isSupabaseConfigured && isOnline) {
      void deletePollInSupabase(pollId)
    }
    return { ok: true }
  }

  function createPetPost(input: { petName: string; photoUrl: string; comments: string }) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }

    const petName = input.petName.trim()
    const photoUrl = input.photoUrl.trim()
    const comments = input.comments.trim()
    if (!petName) {
      return { ok: false, error: 'Nombre de mascota obligatorio.' }
    }
    if (!photoUrl) {
      return { ok: false, error: 'Foto de mascota obligatoria.' }
    }
    if (!comments) {
      return { ok: false, error: 'Comentarios obligatorios.' }
    }

    const petPost: PetPost = {
      id: randomId('pet'),
      petName,
      photoUrl,
      comments,
      createdAt: new Date().toISOString(),
      createdByUserId: session.userId,
      createdByName: session.fullName,
    }

    setPetPosts((previous) => [petPost, ...previous])
    if (isSupabaseConfigured && isOnline) {
      void createPetPostInSupabase(petPost)
    }
    return { ok: true }
  }

  function createParkingReport(input: { description: string }) {
    if (!session) {
      return { ok: false, error: 'Sesion requerida.' }
    }
    if (!['resident', 'tenant', 'board', 'admin'].includes(session.role)) {
      return { ok: false, error: 'Solo residentes/comite pueden reportar estacionamiento.' }
    }
    if (!session.unitNumber?.trim()) {
      return { ok: false, error: 'Tu cuenta no tiene departamento asignado.' }
    }

    const description = input.description.trim()
    if (!description) {
      return { ok: false, error: 'Agrega una descripcion del reporte.' }
    }

    const report: ParkingReport = {
      id: randomId('park'),
      unitNumber: session.unitNumber,
      parkingSpot: getAssignedParkingForUnit(session.unitNumber),
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdByUserId: session.userId,
    }
    setParkingReports((previous) => [report, ...previous])
    return { ok: true }
  }

  function updateParkingReportStatus(input: {
    reportId: string
    status: 'owner_notified' | 'tow_truck_notified'
    guardNote?: string
  }) {
    if (!session || session.role !== 'guard') {
      return { ok: false, error: 'Solo guardia puede atender reportes.' }
    }
    const note = input.guardNote?.trim()
    let found = false
    setParkingReports((previous) =>
      previous.map((report) => {
        if (report.id !== input.reportId) {
          return report
        }
        found = true
        return {
          ...report,
          status: input.status,
          guardNote: note || report.guardNote,
          handledByGuardUserId: session.userId,
          updatedAt: new Date().toISOString(),
        }
      })
    )
    if (!found) {
      return { ok: false, error: 'Reporte no encontrado.' }
    }
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
    if (isSupabaseConfigured && result.created) {
      if (!isOnline) {
        enqueueDomainEvent('package_register', { package: result.created })
      } else {
        void registerPackageInSupabase(result.created).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('package_register', { package: result.created })
          }
        })
      }
    }
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
    if (isSupabaseConfigured) {
      if (!isOnline) {
        enqueueDomainEvent('package_mark_ready', { packageId })
      } else {
        void markPackageReadyInSupabase(packageId).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('package_mark_ready', { packageId })
          }
        })
      }
    }
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
    if (isSupabaseConfigured) {
      if (!isOnline) {
        enqueueDomainEvent('package_deliver', { packageId })
      } else {
        void deliverPackageInSupabase(packageId).then((ok) => {
          if (!ok) {
            enqueueDomainEvent('package_deliver', { packageId })
          }
        })
      }
    }
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
    session,
    authLoading,
    incidents,
    qrPasses,
    packages,
    auditLog,
    reservations,
    parkingReports,
    polls,
    petPosts,
    offlineQueue,
    isOnline,
    syncToast,
    debtMode,
    login,
    logout,
    resetDemoData,
    dismissSyncToast,
    createIncident,
    updateVote,
    acknowledgeIncident,
    markIncidentInProgress,
    addGuardAction,
    resolveIncident,
    createQrPass,
    deleteQrPass,
    createReservation,
    getActiveReservations,
    createPoll,
    votePoll,
    endPoll,
    deletePoll,
    createPetPost,
    createParkingReport,
    updateParkingReportStatus,
    getAssignedParkingForUnit,
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
