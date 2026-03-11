import { useEffect, useMemo, useState } from 'react'
import { useDemoData } from '../../shared/state/DemoDataContext'
import {
  canManageAdminUsers,
  canManagePush,
  canModerateCommunity,
  canViewOperationalDashboard,
} from '../../shared/domain/capabilities'
import {
  getLifecycleBadgeClass,
  getLifecycleLabel,
  getModulesForRole,
} from '../../shared/domain/moduleStatus'
import { buildAdminDashboardSnapshot } from '../../shared/ops/dashboard'
import { useOperationalMetrics } from '../../shared/ops/operational'
import {
  adminCreateOrInviteUser,
  adminSendTargetedPush,
  fetchManagedProfiles,
  type AdminPushTargetMode,
  type ManagedProfile,
  type ManagedUserRole,
} from '../../shared/supabase/admin'
import { listAdminCharges } from '../../shared/supabase/data'
import { AppButton, AppCard, ModulePlaceholder } from '../../shared/ui'
import type { PaymentCharge } from '../finance'
export { AdminPackagesPage } from '../packages/pages'

export function AdminDashboardPage() {
  const {
    incidents,
    parkingReports,
    packages,
    qrPasses,
    session,
    unitAccountEntries,
  } = useDemoData()
  const operationalMetrics = useOperationalMetrics(30)
  const availableModules = getModulesForRole(session?.role)
  const snapshot = buildAdminDashboardSnapshot({
    qrPasses,
    packages,
    incidents,
    parkingReports,
    unitAccountEntries,
    moduleStatuses: availableModules,
    operationalEvents: operationalMetrics.events,
  })

  if (!canViewOperationalDashboard(session?.role)) {
    return (
      <AppCard className="text-sm text-[var(--color-text-muted)]">
        Solo administracion/comite puede ver el dashboard operativo.
      </AppCard>
    )
  }

  const statCards = [
    { label: 'Visitas activas hoy', value: snapshot.activeVisitsToday },
    { label: 'Paquetes pendientes', value: snapshot.heldPackages },
    { label: 'Incidencias abiertas', value: snapshot.openIncidents },
    { label: 'SLA vencido', value: snapshot.overdueIncidents },
    { label: 'Parking abierto', value: snapshot.openParkingReports },
    { label: 'Adeudos vencidos', value: snapshot.overdueUnitAccounts },
  ]

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Administrador / Comite"
        title="Dashboard"
        description="Panel operativo con KPIs reales, alertas y estado de modulos."
      />
      <div className="grid grid-cols-2 gap-2">
        {statCards.map((card) => (
          <AppCard className="space-y-1" key={card.label}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              {card.label}
            </p>
            <p className="text-2xl font-semibold text-[var(--color-text)]">{card.value}</p>
          </AppCard>
        ))}
      </div>
      <AppCard className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">Operational inbox</p>
          <span className="text-xs text-[var(--color-text-muted)]">Ultimos 30 dias</span>
        </div>
        {snapshot.inbox.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sin alertas operativas activas.</p>
        ) : (
          snapshot.inbox.map((item) => (
            <div
              className={`rounded-xl border px-3 py-2 ${
                item.severity === 'high'
                  ? 'border-red-500/40 bg-red-500/10'
                  : item.severity === 'medium'
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-muted)]'
              }`}
              key={item.id}
            >
              <p className="text-sm font-semibold text-[var(--color-text)]">{item.title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{item.detail}</p>
            </div>
          ))
        )}
      </AppCard>
      <AppCard className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">Confiabilidad operativa</p>
          <span className="text-xs text-[var(--color-text-muted)]">
            QR rechazo {(operationalMetrics.rejectionRate * 100).toFixed(0)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-[var(--color-text)]">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
            Sync failed: {operationalMetrics.counts.sync_failed}
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
            Edge fn errors: {operationalMetrics.counts.edge_function_error}
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
            Upload errors: {operationalMetrics.counts.upload_error}
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
            Offline queue: {operationalMetrics.counts.offline_queue_enqueued}
          </div>
        </div>
      </AppCard>
      <AppCard className="space-y-2">
        <p className="text-sm font-semibold text-[var(--color-text)]">Estado de modulos</p>
        <div className="space-y-2">
          {availableModules.map((module) => (
            <div className="rounded-xl border border-[var(--color-border)] px-3 py-2" key={module.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">{module.name}</p>
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${getLifecycleBadgeClass(module.lifecycle)}`}
                >
                  {getLifecycleLabel(module.lifecycle)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{module.summary}</p>
            </div>
          ))}
        </div>
      </AppCard>
    </div>
  )
}

export function AdminUsersPage() {
  const { session } = useDemoData()
  const [mode, setMode] = useState<'invite' | 'create'>('invite')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ManagedUserRole>('resident')
  const [unitNumber, setUnitNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('success')

  const roles: ManagedUserRole[] = [
    'resident',
    'tenant',
    'guard',
    'board_member',
    'maintenance',
    'admin',
  ]
  const requiresDepartment = ['resident', 'tenant', 'board_member'].includes(role)
  const blocksDepartment = role === 'guard'

  async function handleSubmit() {
    const trimmedDepartment = unitNumber.trim()
    if (!email.trim()) {
      setFeedbackType('error')
      setFeedback('Correo requerido.')
      return
    }
    if (mode === 'create' && !password.trim()) {
      setFeedbackType('error')
      setFeedback('Contrasena temporal requerida para modo create.')
      return
    }
    if (requiresDepartment && !trimmedDepartment) {
      setFeedbackType('error')
      setFeedback('Departamento obligatorio para resident, tenant y board_member.')
      return
    }
    if (blocksDepartment && trimmedDepartment) {
      setFeedbackType('error')
      setFeedback('Guard no debe tener departamento asignado.')
      return
    }

    setLoading(true)
    const result = await adminCreateOrInviteUser({
      mode,
      email,
      role,
      unitNumber: blocksDepartment ? undefined : (trimmedDepartment || undefined),
      password: mode === 'create' ? password : undefined,
    })
    setLoading(false)

    if (!result.ok) {
      setFeedbackType('error')
      setFeedback(localizeAdminError(result.error))
      return
    }

    setFeedbackType('success')
    setFeedback(
      mode === 'invite'
        ? `Invitacion enviada a ${result.email ?? email}.`
        : `Usuario creado: ${result.email ?? email}.`
    )
    setPassword('')
  }

  if (!canManageAdminUsers(session?.role)) {
    return (
      <AppCard className="text-sm text-[var(--color-text-muted)]">
        Solo administradores pueden crear o invitar usuarios.
      </AppCard>
    )
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Administrador"
        title="Usuarios"
        description="Invita o crea cuentas y asigna perfil/rol inicial."
      />
      <AppCard className="space-y-2">
        <label className="block text-xs text-[var(--color-text-muted)]">
          Modo
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)]"
            onChange={(event) => setMode(event.target.value as 'invite' | 'create')}
            value={mode}
          >
            <option value="invite">Invite por email (set password en link)</option>
            <option value="create">Create con password temporal</option>
          </select>
        </label>
        <label className="block text-xs text-[var(--color-text-muted)]">
          Correo
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@dominio.com"
            type="email"
            value={email}
          />
        </label>
        {mode === 'create' ? (
          <label className="block text-xs text-[var(--color-text-muted)]">
            Contrasena temporal
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo 8 caracteres"
              type="password"
              value={password}
            />
          </label>
        ) : null}
        <label className="block text-xs text-[var(--color-text-muted)]">
          Rol
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)]"
            onChange={(event) => {
              const nextRole = event.target.value as ManagedUserRole
              setRole(nextRole)
              if (nextRole === 'guard') {
                setUnitNumber('')
              }
            }}
            value={role}
          >
            {roles.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-[var(--color-text-muted)]">
          Departamento:
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            disabled={blocksDepartment}
            onChange={(event) => setUnitNumber(event.target.value)}
            placeholder={blocksDepartment ? 'No aplica para guard' : '1141'}
            value={unitNumber}
          />
        </label>
        <AppButton block disabled={loading} onClick={() => void handleSubmit()}>
          {loading ? 'Procesando...' : mode === 'invite' ? 'Enviar invitacion' : 'Crear usuario'}
        </AppButton>
        {feedback ? (
          <p
            className={
              feedbackType === 'error'
                ? 'text-xs text-red-600'
                : 'text-xs text-[var(--color-text-muted)]'
            }
          >
            {feedback}
          </p>
        ) : null}
      </AppCard>
    </div>
  )
}

export function AdminPushPage() {
  const { session } = useDemoData()
  const [targetMode, setTargetMode] = useState<AdminPushTargetMode>('user')
  const [targetUserId, setTargetUserId] = useState('')
  const [targetUnit, setTargetUnit] = useState('')
  const [targetRole, setTargetRole] = useState<ManagedUserRole>('resident')
  const [includeCaller, setIncludeCaller] = useState(false)
  const [title, setTitle] = useState('Privada Reforma')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/app/home')
  const [tag, setTag] = useState('admin-manual')
  const [profiles, setProfiles] = useState<ManagedProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('success')

  const roles: ManagedUserRole[] = [
    'resident',
    'tenant',
    'guard',
    'board_member',
    'maintenance',
    'admin',
  ]

  const unitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          profiles
            .map((profile) => profile.unitNumber?.trim() ?? '')
            .filter((value) => value.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [profiles],
  )

  useEffect(() => {
    if (!canManagePush(session?.role)) {
      return
    }
    setLoadingProfiles(true)
    void fetchManagedProfiles()
      .then((rows) => {
        if (rows) {
          setProfiles(rows)
        }
      })
      .finally(() => setLoadingProfiles(false))
  }, [session])

  async function handleSend() {
    const trimmedBody = body.trim()
    if (!trimmedBody) {
      setFeedbackType('error')
      setFeedback('Mensaje obligatorio.')
      return
    }
    if (targetMode === 'user' && !targetUserId.trim()) {
      setFeedbackType('error')
      setFeedback('Selecciona un usuario destino.')
      return
    }
    if (targetMode === 'unit' && !targetUnit.trim()) {
      setFeedbackType('error')
      setFeedback('Selecciona una unidad destino.')
      return
    }

    setSending(true)
    setFeedback('')
    const result = await adminSendTargetedPush({
      targetMode,
      userId: targetMode === 'user' ? targetUserId.trim() : undefined,
      unitNumber: targetMode === 'unit' ? targetUnit.trim() : undefined,
      role: targetMode === 'role' ? targetRole : undefined,
      includeCaller,
      title: title.trim() || undefined,
      body: trimmedBody,
      url: url.trim() || undefined,
      tag: tag.trim() || undefined,
    })
    setSending(false)

    if (!result.ok) {
      setFeedbackType('error')
      setFeedback(localizePushError(result.error))
      return
    }

    setFeedbackType('success')
    setFeedback(
      `Enviado. Suscripciones notificadas: ${result.sent ?? 0}. Destinos: ${result.targetUsers ?? 0}. Eliminadas por vencimiento: ${result.removed ?? 0}.`,
    )
    setBody('')
  }

  if (!canManagePush(session?.role)) {
    return (
      <AppCard className="text-sm text-[var(--color-text-muted)]">
        Solo administradores pueden enviar notificaciones push masivas.
      </AppCard>
    )
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Administrador"
        title="Push Notifications"
        description="Envio manual por usuario, unidad, rol o global."
      />
      <AppCard className="space-y-2">
        <label className="block text-xs text-[var(--color-text-muted)]">
          Destino
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)]"
            onChange={(event) => setTargetMode(event.target.value as AdminPushTargetMode)}
            value={targetMode}
          >
            <option value="user">Usuario especifico</option>
            <option value="unit">Unidad especifica</option>
            <option value="role">Rol especifico</option>
            <option value="all">Todos los usuarios</option>
          </select>
        </label>

        {targetMode === 'user' ? (
          <label className="block text-xs text-[var(--color-text-muted)]">
            Usuario
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)]"
              onChange={(event) => setTargetUserId(event.target.value)}
              value={targetUserId}
            >
              <option value="">Selecciona usuario</option>
              {profiles.map((profile) => (
                <option key={profile.userId} value={profile.userId}>
                  {profile.role} | {profile.unitNumber ?? 'sin unidad'} | {profile.userId.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {targetMode === 'unit' ? (
          <label className="block text-xs text-[var(--color-text-muted)]">
            Unidad
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)]"
              onChange={(event) => setTargetUnit(event.target.value)}
              value={targetUnit}
            >
              <option value="">Selecciona unidad</option>
              {unitOptions.map((unitNumber) => (
                <option key={unitNumber} value={unitNumber}>
                  {unitNumber}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {targetMode === 'role' ? (
          <label className="block text-xs text-[var(--color-text-muted)]">
            Rol
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)]"
              onChange={(event) => setTargetRole(event.target.value as ManagedUserRole)}
              value={targetRole}
            >
              {roles.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block text-xs text-[var(--color-text-muted)]">
          Titulo
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Privada Reforma"
            type="text"
            value={title}
          />
        </label>
        <label className="block text-xs text-[var(--color-text-muted)]">
          Mensaje
          <textarea
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escribe el contenido de la notificacion."
            rows={3}
            value={body}
          />
        </label>
        <label className="block text-xs text-[var(--color-text-muted)]">
          URL destino
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="/app/home"
            type="text"
            value={url}
          />
        </label>
        <label className="block text-xs text-[var(--color-text-muted)]">
          Tag
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            onChange={(event) => setTag(event.target.value)}
            placeholder="admin-manual"
            type="text"
            value={tag}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            checked={includeCaller}
            onChange={(event) => setIncludeCaller(event.target.checked)}
            type="checkbox"
          />
          Incluir mi propio usuario como destino
        </label>

        <AppButton block disabled={sending || loadingProfiles} onClick={() => void handleSend()}>
          {sending ? 'Enviando...' : 'Enviar notificacion'}
        </AppButton>

        {loadingProfiles ? (
          <p className="text-xs text-[var(--color-text-muted)]">Cargando perfiles...</p>
        ) : null}
        {feedback ? (
          <p
            className={
              feedbackType === 'error'
                ? 'text-xs text-red-600'
                : 'text-xs text-[var(--color-text-muted)]'
            }
          >
            {feedback}
          </p>
        ) : null}
      </AppCard>
    </div>
  )
}

export function AdminReportsPage() {
  const {
    session,
    moderationReports,
    incidents,
    petPosts,
    marketplacePosts,
    dismissModerationReport,
    actionModerationReportDeleteTarget,
  } = useDemoData()
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('success')

  const openReports = moderationReports.filter((report) => report.status === 'open')

  function resolveTargetSummary(report: (typeof moderationReports)[number]) {
    if (report.targetType === 'incident') {
      const incident = incidents.find((entry) => entry.id === report.targetId)
      return incident ? `Incidencia: ${incident.title}` : 'Incidencia eliminada/no encontrada'
    }
    if (report.targetType === 'pet_post') {
      const petPost = petPosts.find((entry) => entry.id === report.targetId)
      return petPost ? `Mascota: ${petPost.petName}` : 'Publicacion de mascota eliminada/no encontrada'
    }
    const marketPost = marketplacePosts.find((entry) => entry.id === report.targetId)
    return marketPost ? `Marketplace: ${marketPost.title}` : 'Publicacion marketplace eliminada/no encontrada'
  }

  if (!canModerateCommunity(session?.role)) {
    return (
      <AppCard className="text-sm text-[var(--color-text-muted)]">
        Solo administradores/comite pueden moderar reportes.
      </AppCard>
    )
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Administrador / Comite"
        title="Reports"
        description="Revision de contenido reportado por la comunidad."
      />
      {feedback ? (
        <AppCard className={feedbackType === 'error' ? 'border-red-700' : 'border-emerald-700'}>
          <p className={feedbackType === 'error' ? 'text-sm text-red-400' : 'text-sm text-emerald-300'}>
            {feedback}
          </p>
        </AppCard>
      ) : null}
      {openReports.length === 0 ? (
        <AppCard className="text-sm text-[var(--color-text-muted)]">Sin reportes abiertos.</AppCard>
      ) : (
        <div className="space-y-2">
          {openReports.map((report) => (
            <AppCard className="space-y-2 border-zinc-800 bg-zinc-950" key={report.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {report.targetType} | {resolveTargetSummary(report)}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Reportado por: {report.createdByName} - {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold uppercase text-amber-200">
                  Open
                </span>
              </div>
              <p className="text-xs text-zinc-300">Motivo: {report.reason}</p>
              {report.details ? <p className="text-xs text-zinc-400">Detalle: {report.details}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <AppButton
                  block
                  onClick={() => {
                    const result = actionModerationReportDeleteTarget(report.id)
                    if (!result.ok) {
                      setFeedbackType('error')
                      setFeedback(result.error ?? 'No se pudo eliminar contenido.')
                      return
                    }
                    setFeedbackType('success')
                    setFeedback('Contenido eliminado y reporte cerrado.')
                  }}
                  variant="danger"
                >
                  Eliminar contenido
                </AppButton>
                <AppButton
                  block
                  onClick={() => {
                    const result = dismissModerationReport(report.id)
                    if (!result.ok) {
                      setFeedbackType('error')
                      setFeedback(result.error ?? 'No se pudo descartar reporte.')
                      return
                    }
                    setFeedbackType('success')
                    setFeedback('Reporte descartado.')
                  }}
                  variant="secondary"
                >
                  Remover reporte
                </AppButton>
              </div>
            </AppCard>
          ))}
        </div>
      )}
    </div>
  )
}

function localizeAdminError(raw?: string): string {
  if (!raw?.trim()) return 'No fue posible completar la operacion.'
  const lower = raw.toLowerCase()

  if (lower.includes('non-2xx')) {
    return 'El servidor rechazo la solicitud. Revisa los logs de la funcion para ver el detalle.'
  }
  if (lower.includes('invalid jwt')) {
    return 'La sesion no fue aceptada por el servidor. Cierra sesion, vuelve a entrar y vuelve a intentar.'
  }
  if (
    lower.includes('not admin') ||
    lower.includes('forbidden') ||
    lower.includes('unauthorized')
  ) {
    return 'Tu usuario no tiene permisos de administrador para crear o invitar usuarios.'
  }
  if (lower.includes('unit') || lower.includes('unit_number')) {
    return 'Regla de departamento invalida. resident/tenant/board requieren departamento y guard no debe tenerlo.'
  }
  if (lower.includes('email') && lower.includes('already')) {
    return 'Ese correo ya existe. Usa otro correo o intenta con modo invite.'
  }
  if (lower.includes('invalid') && lower.includes('email')) {
    return 'El correo no es valido. Verifica el formato.'
  }
  if (lower.includes('password')) {
    return 'La contrasena no cumple requisitos. Usa al menos 8 caracteres.'
  }

  return `No se pudo completar la operacion: ${raw}`
}

function localizePushError(raw?: string): string {
  if (!raw?.trim()) return 'No fue posible enviar notificaciones.'
  const lower = raw.toLowerCase()

  if (lower.includes('only admins')) {
    return 'Solo administradores pueden enviar notificaciones masivas.'
  }
  if (lower.includes('missing bearer') || lower.includes('invalid session')) {
    return 'Sesion invalida. Cierra sesion y vuelve a entrar.'
  }
  if (lower.includes('vapid')) {
    return 'Faltan llaves VAPID en los secrets de Supabase Functions.'
  }
  if (lower.includes('targetmode') || lower.includes('required')) {
    return 'Faltan campos obligatorios de destino o mensaje.'
  }

  return `No fue posible enviar: ${raw}`
}

export function AdminDebtsPage() {
  const [charges, setCharges] = useState<PaymentCharge[]>([])
  const [loading, setLoading] = useState(false)
  const [onlyOpen, setOnlyOpen] = useState(true)

  useEffect(() => {
    setLoading(true)
    void listAdminCharges(onlyOpen ? { status: 'pending' } : undefined)
      .then((rows) => setCharges(rows ?? []))
      .finally(() => setLoading(false))
  }, [onlyOpen])

  const debtCharges = charges.filter((charge) =>
    ['pending', 'requires_action', 'failed'].includes(charge.status)
  )

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Administrador / Comite"
        title="Adeudos"
        description="Control de morosidad y seguimiento de cobranza."
      />
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input checked={onlyOpen} onChange={(event) => setOnlyOpen(event.target.checked)} type="checkbox" />
          Mostrar solo pendientes
        </label>
        <p className="text-xs text-zinc-400">Total adeudos: {debtCharges.length}</p>
      </AppCard>
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        {loading ? (
          <p className="text-sm text-zinc-400">Cargando adeudos...</p>
        ) : debtCharges.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin adeudos abiertos.</p>
        ) : (
          <div className="space-y-2">
            {debtCharges.map((charge) => (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" key={charge.id}>
                <p className="text-sm font-semibold text-zinc-100">
                  Unidad {charge.unitNumber} | ${charge.amountMxn.toLocaleString('es-MX')} MXN
                </p>
                <p className="text-xs text-zinc-400">Estatus: {charge.status}</p>
                <p className="text-xs text-zinc-500">{new Date(charge.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  )
}

export function AdminVisitsPage() {
  return (
    <ModulePlaceholder
      role="Administrador / Comite"
      title="Visitas"
      description="Monitoreo de accesos y trazabilidad de invitados."
    />
  )
}

export function AdminIncidentsPage() {
  return (
    <ModulePlaceholder
      role="Administrador / Comite"
      title="Incidencias"
      description="Consolidado, clasificacion y estatus de reportes."
    />
  )
}

export function AdminMaintenancePage() {
  return (
    <ModulePlaceholder
      role="Administrador / Comite"
      title="Mantenimiento"
      description="Programacion de proveedores y ordenes de trabajo."
    />
  )
}

export function AdminAnnouncementsPage() {
  return (
    <ModulePlaceholder
      role="Administrador / Comite"
      title="Comunicados"
      description="Publicacion de avisos masivos para la privada."
    />
  )
}

export function AdminFinancePage() {
  const {
    financialCategories,
    getAvailableFinancialPeriods,
    getCommunityFinancialSummary,
    getVisibleFinancialMovements,
    getUnitAccountStatement,
    createFinancialMovement,
    createUnitAccountEntry,
    publishFinancialPeriodClose,
  } = useDemoData()
  const [charges, setCharges] = useState<PaymentCharge[]>([])
  const [loading, setLoading] = useState(false)
  const [unitFilter, setUnitFilter] = useState('')
  const [financeMessage, setFinanceMessage] = useState('')
  const [movementType, setMovementType] = useState<'income' | 'expense'>('expense')
  const [movementCategory, setMovementCategory] = useState('Agua')
  const [movementAmount, setMovementAmount] = useState('0')
  const [movementDescription, setMovementDescription] = useState('')
  const [movementVendor, setMovementVendor] = useState('')
  const [movementVisibility, setMovementVisibility] = useState<'community' | 'board_only' | 'unit_private'>('community')
  const [movementUnitNumber, setMovementUnitNumber] = useState('')
  const [movementEvidenceUrl, setMovementEvidenceUrl] = useState('')
  const [ledgerUnitNumber, setLedgerUnitNumber] = useState('11-22')
  const [ledgerEntryType, setLedgerEntryType] = useState<'charge' | 'payment' | 'adjustment'>('charge')
  const [ledgerCategory, setLedgerCategory] = useState('Mantenimiento')
  const [ledgerAmount, setLedgerAmount] = useState('0')
  const [ledgerDirection, setLedgerDirection] = useState<'debit' | 'credit'>('debit')
  const [ledgerOccurredAt, setLedgerOccurredAt] = useState('2026-01-01')
  const [ledgerDueAt, setLedgerDueAt] = useState('2026-01-10')
  const [ledgerStatus, setLedgerStatus] = useState<'posted' | 'pending' | 'overdue' | 'paid' | 'partial'>('posted')
  const [ledgerNotes, setLedgerNotes] = useState('')
  const [closeOpeningBalance, setCloseOpeningBalance] = useState('0')
  const [closeNotes, setCloseNotes] = useState('')

  useEffect(() => {
    setLoading(true)
    void listAdminCharges({ unitNumber: unitFilter.trim() || undefined })
      .then((rows) => setCharges(rows ?? []))
      .finally(() => setLoading(false))
  }, [unitFilter])

  const totals = charges.reduce(
    (acc, charge) => {
      if (charge.status === 'paid') {
        acc.paid += charge.amountMxn
      } else if (['pending', 'requires_action', 'failed'].includes(charge.status)) {
        acc.open += charge.amountMxn
      }
      return acc
    },
    { paid: 0, open: 0 }
  )
  const money = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`
  const periods = getAvailableFinancialPeriods()
  const selectedPeriod = periods[0]
  const summary = getCommunityFinancialSummary(selectedPeriod ?? undefined)
  const movementCategoryOptions = financialCategories
    .filter((category) => category.type === movementType && category.isActive)
    .map((category) => category.name)
  const unitStatement = getUnitAccountStatement({
    unitNumber: unitFilter.trim() || ledgerUnitNumber.trim() || undefined,
    ...(selectedPeriod ?? {}),
  })
  const visibleMovements = getVisibleFinancialMovements(selectedPeriod ?? undefined)

  useEffect(() => {
    if (movementCategoryOptions.length > 0 && !movementCategoryOptions.includes(movementCategory)) {
      setMovementCategory(movementCategoryOptions[0] ?? '')
    }
  }, [movementCategory, movementCategoryOptions])

  function handleCreateMovement() {
    if (!selectedPeriod) {
      setFinanceMessage('No hay periodo disponible para registrar movimientos.')
      return
    }
    const result = createFinancialMovement({
      type: movementType,
      category: movementCategory,
      amountMxn: Number(movementAmount),
      occurredAt: new Date(`${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, '0')}-01T12:00:00-08:00`).toISOString(),
      periodYear: selectedPeriod.year,
      periodMonth: selectedPeriod.month,
      description: movementDescription,
      vendorOrSource: movementVendor || undefined,
      unitNumber: movementVisibility === 'unit_private' ? movementUnitNumber : undefined,
      visibilityScope: movementVisibility,
      evidenceUrl: movementEvidenceUrl || undefined,
    })
    setFinanceMessage(result.ok ? 'Movimiento financiero guardado.' : (result.error ?? 'No fue posible guardar movimiento.'))
  }

  function handleCreateLedgerEntry() {
    const occurredAt = ledgerOccurredAt ? new Date(`${ledgerOccurredAt}T12:00:00-08:00`).toISOString() : new Date().toISOString()
    const result = createUnitAccountEntry({
      unitNumber: ledgerUnitNumber,
      entryType: ledgerEntryType,
      category: ledgerCategory,
      amountMxn: Number(ledgerAmount),
      direction: ledgerDirection,
      occurredAt,
      dueAt: ledgerDueAt || undefined,
      status: ledgerStatus,
      notes: ledgerNotes || undefined,
    })
    setFinanceMessage(result.ok ? 'Asiento por unidad guardado.' : (result.error ?? 'No fue posible guardar asiento.'))
  }

  function handlePublishClose() {
    if (!selectedPeriod) {
      setFinanceMessage('No hay periodo para publicar.')
      return
    }
    const result = publishFinancialPeriodClose({
      year: selectedPeriod.year,
      month: selectedPeriod.month,
      openingBalanceMxn: Number(closeOpeningBalance),
      closingBalanceMxn: Number(closeOpeningBalance) + summary.netMxn,
      notes: closeNotes || undefined,
    })
    setFinanceMessage(result.ok ? 'Corte mensual publicado.' : (result.error ?? 'No fue posible publicar el corte.'))
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Administrador / Comite"
        title="Finanzas"
        description="Ingresos, egresos, presupuesto y transparencia."
      />
      {financeMessage ? <AppCard className="text-xs text-zinc-200">{financeMessage}</AppCard> : null}
      <div className="grid grid-cols-2 gap-2">
        <AppCard className="border-zinc-800 bg-zinc-950">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">Saldo inicial</p>
          <p className="mt-1 text-lg font-bold text-white">{money(summary.openingBalanceMxn)}</p>
        </AppCard>
        <AppCard className="border-zinc-800 bg-zinc-950">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">Saldo final</p>
          <p className="mt-1 text-lg font-bold text-white">{money(summary.closingBalanceMxn)}</p>
        </AppCard>
        <AppCard className="border-zinc-800 bg-zinc-950">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">Ingresos</p>
          <p className="mt-1 text-lg font-bold text-emerald-300">{money(summary.incomeTotalMxn)}</p>
        </AppCard>
        <AppCard className="border-zinc-800 bg-zinc-950">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">Gastos</p>
          <p className="mt-1 text-lg font-bold text-amber-300">{money(summary.expenseTotalMxn)}</p>
        </AppCard>
      </div>
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Registrar movimiento financiero</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-400">
            Tipo
            <select
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setMovementType(event.target.value as 'income' | 'expense')}
              value={movementType}
            >
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
            </select>
          </label>
          <label className="block text-xs text-zinc-400">
            Categoria
            <select
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setMovementCategory(event.target.value)}
              value={movementCategory}
            >
              {movementCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs text-zinc-400">
          Monto
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setMovementAmount(event.target.value)}
            type="number"
            value={movementAmount}
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Descripcion
          <textarea
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setMovementDescription(event.target.value)}
            rows={2}
            value={movementDescription}
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs text-zinc-400">
            Fuente / proveedor
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setMovementVendor(event.target.value)}
              value={movementVendor}
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Visibilidad
            <select
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) =>
                setMovementVisibility(event.target.value as 'community' | 'board_only' | 'unit_private')
              }
              value={movementVisibility}
            >
              <option value="community">Comunidad</option>
              <option value="board_only">Solo comite</option>
              <option value="unit_private">Privado por unidad</option>
            </select>
          </label>
        </div>
        {movementVisibility === 'unit_private' ? (
          <label className="block text-xs text-zinc-400">
            Unidad asociada
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setMovementUnitNumber(event.target.value)}
              value={movementUnitNumber}
            />
          </label>
        ) : null}
        <label className="block text-xs text-zinc-400">
          URL de comprobante (opcional)
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setMovementEvidenceUrl(event.target.value)}
            value={movementEvidenceUrl}
          />
        </label>
        <AppButton block onClick={handleCreateMovement}>Guardar movimiento</AppButton>
      </AppCard>

      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Registrar estado de cuenta por unidad</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-400">
            Unidad
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setLedgerUnitNumber(event.target.value)}
              value={ledgerUnitNumber}
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Tipo
            <select
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setLedgerEntryType(event.target.value as 'charge' | 'payment' | 'adjustment')}
              value={ledgerEntryType}
            >
              <option value="charge">Cargo</option>
              <option value="payment">Pago</option>
              <option value="adjustment">Ajuste</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-400">
            Categoria
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setLedgerCategory(event.target.value)}
              value={ledgerCategory}
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Direccion
            <select
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setLedgerDirection(event.target.value as 'debit' | 'credit')}
              value={ledgerDirection}
            >
              <option value="debit">Debe</option>
              <option value="credit">Haber</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-400">
            Monto
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setLedgerAmount(event.target.value)}
              type="number"
              value={ledgerAmount}
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Estatus
            <select
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) =>
                setLedgerStatus(event.target.value as 'posted' | 'pending' | 'overdue' | 'paid' | 'partial')
              }
              value={ledgerStatus}
            >
              <option value="posted">Publicado</option>
              <option value="pending">Pendiente</option>
              <option value="overdue">Vencido</option>
              <option value="paid">Pagado</option>
              <option value="partial">Parcial</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-400">
            Fecha
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setLedgerOccurredAt(event.target.value)}
              type="date"
              value={ledgerOccurredAt}
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Vencimiento
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => setLedgerDueAt(event.target.value)}
              type="date"
              value={ledgerDueAt}
            />
          </label>
        </div>
        <label className="block text-xs text-zinc-400">
          Notas
          <textarea
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setLedgerNotes(event.target.value)}
            rows={2}
            value={ledgerNotes}
          />
        </label>
        <AppButton block onClick={handleCreateLedgerEntry}>Guardar asiento</AppButton>
      </AppCard>

      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Publicar corte mensual</p>
        <label className="block text-xs text-zinc-400">
          Saldo inicial
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setCloseOpeningBalance(event.target.value)}
            type="number"
            value={closeOpeningBalance}
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Notas del corte
          <textarea
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setCloseNotes(event.target.value)}
            rows={2}
            value={closeNotes}
          />
        </label>
        <p className="text-xs text-zinc-300">
          Cierre proyectado del periodo: {money(Number(closeOpeningBalance || 0) + summary.netMxn)}
        </p>
        <AppButton block onClick={handlePublishClose}>Publicar corte</AppButton>
      </AppCard>

      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <label className="block text-xs text-zinc-400">
          Filtrar unidad
          <input
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            onChange={(event) => setUnitFilter(event.target.value)}
            placeholder="Ej. 11-22"
            value={unitFilter}
          />
        </label>
        <p className="text-xs text-zinc-300">
          Pagado Stripe: {money(totals.paid)} | Abierto Stripe: {money(totals.open)}
        </p>
        <p className="text-xs text-zinc-300">
          Saldo unidad: {money(unitStatement.balanceMxn)} | Vencido: {money(unitStatement.overdueMxn)}
        </p>
      </AppCard>
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Movimientos publicados del periodo</p>
        {visibleMovements.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin movimientos financieros.</p>
        ) : (
          <div className="space-y-2">
            {visibleMovements.map((movement) => (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" key={movement.id}>
                <p className="text-sm font-semibold text-zinc-100">
                  {movement.category} | {movement.type === 'income' ? '+' : '-'}{money(movement.amountMxn)}
                </p>
                <p className="text-xs text-zinc-400">
                  {movement.visibilityScope} | {movement.unitNumber ?? 'global'} | {new Date(movement.occurredAt).toLocaleDateString()}
                </p>
                <p className="mt-1 text-xs text-zinc-300">{movement.description}</p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Estado de cuenta filtrado</p>
        {unitStatement.entries.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin asientos para la unidad filtrada.</p>
        ) : (
          <div className="space-y-2">
            {unitStatement.entries.map((entry) => (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" key={entry.id}>
                <p className="text-sm font-semibold text-zinc-100">
                  {entry.unitNumber} | {entry.category} | {entry.entryType}
                </p>
                <p className="text-xs text-zinc-400">
                  {entry.direction} | {entry.status} | {new Date(entry.occurredAt).toLocaleDateString()}
                </p>
                <p className="mt-1 text-xs text-zinc-300">{money(entry.amountMxn)}</p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        {loading ? (
          <p className="text-sm text-zinc-400">Cargando cargos...</p>
        ) : charges.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin movimientos.</p>
        ) : (
          <div className="space-y-2">
            {charges.map((charge) => (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" key={charge.id}>
                <p className="text-sm font-semibold text-zinc-100">
                  {charge.unitNumber} | ${charge.amountMxn.toLocaleString('es-MX')} MXN
                </p>
                <p className="text-xs text-zinc-400">
                  {charge.chargeType} | {charge.status}
                </p>
                <p className="text-xs text-zinc-500">{new Date(charge.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  )
}

export function AdminExportsPage() {
  return (
    <ModulePlaceholder
      role="Administrador / Comite"
      title="Exportaciones"
      description="Generacion de reportes CSV/PDF para operacion y comite."
    />
  )
}
