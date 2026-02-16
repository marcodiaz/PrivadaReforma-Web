import { useState } from 'react'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { adminCreateOrInviteUser, type ManagedUserRole } from '../../shared/supabase/admin'
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

  async function handleSubmit() {
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

    setLoading(true)
    const result = await adminCreateOrInviteUser({
      mode,
      email,
      role,
      unitNumber: unitNumber.trim() || undefined,
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
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
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
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
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
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            onChange={(event) => setRole(event.target.value as ManagedUserRole)}
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
          unit_number (opcional para guard/admin/board)
          <input
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            onChange={(event) => setUnitNumber(event.target.value)}
            placeholder="1141"
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

function localizeAdminError(raw?: string): string {
  if (!raw?.trim()) return 'No fue posible completar la operacion.'
  const lower = raw.toLowerCase()

  if (lower.includes('non-2xx')) {
    return 'El servidor rechazo la solicitud. Revisa los logs de la funcion para ver el detalle.'
  }
  if (
    lower.includes('not admin') ||
    lower.includes('forbidden') ||
    lower.includes('unauthorized')
  ) {
    return 'Tu usuario no tiene permisos de administrador para crear o invitar usuarios.'
  }
  if (lower.includes('unit') || lower.includes('unit_number')) {
    return 'Falta unit_number. Para resident/tenant/maintenance debes capturar la unidad.'
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
