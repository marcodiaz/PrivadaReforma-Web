import { useEffect, useMemo, useState } from 'react'
import { useDemoData } from '../../shared/state/DemoDataContext'
import {
  adminCreateOrInviteUser,
  adminSendTargetedPush,
  fetchManagedProfiles,
  type AdminPushTargetMode,
  type ManagedProfile,
  type ManagedUserRole,
} from '../../shared/supabase/admin'
import { AppButton, AppCard, ModulePlaceholder } from '../../shared/ui'
export { AdminPackagesPage } from '../packages/pages'

export function AdminDashboardPage() {
  return (
    <ModulePlaceholder
      role="Administrador / Comite"
      title="Dashboard"
      description="Vista ejecutiva con KPIs operativos y financieros."
    />
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

  if (!session || session.role !== 'admin') {
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
    if (!session || session.role !== 'admin') {
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

  if (!session || session.role !== 'admin') {
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
  return (
    <ModulePlaceholder
      role="Administrador / Comite"
      title="Adeudos"
      description="Control de morosidad y seguimiento de cobranza."
    />
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
  return (
    <ModulePlaceholder
      role="Administrador / Comite"
      title="Finanzas"
      description="Ingresos, egresos, presupuesto y transparencia."
    />
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
