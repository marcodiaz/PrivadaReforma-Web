import { AppButton, AppCard, ModulePlaceholder } from '../../shared/ui'
import { useDemoData } from '../../shared/state/DemoDataContext'

function getIncidentPriority(incident: {
  supports: number
  opposes: number
  status: string
}) {
  const score = incident.supports - incident.opposes
  if (incident.status !== 'resolved' && score >= 5) {
    return 'critica'
  }
  if (incident.status !== 'resolved' && score >= 3) {
    return 'alta'
  }
  return 'normal'
}

function priorityStyles(priority: string) {
  if (priority === 'critica') {
    return 'border-red-500/40 bg-red-50'
  }
  if (priority === 'alta') {
    return 'border-amber-500/40 bg-amber-50'
  }
  return ''
}

export function AppHomePage() {
  const { incidents, qrPasses } = useDemoData()
  const activeAlerts = incidents.filter(
    (incident) => incident.supports - incident.opposes >= 3,
  ).length
  const activeQr = qrPasses.filter((pass) => pass.status === 'active').length

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Inicio"
        description="Resumen de accesos, alertas y estado general de la privada."
      />
      <div className="grid grid-cols-2 gap-3">
        <AppCard>
          <p className="text-xs text-[var(--color-text-muted)]">QR activos</p>
          <p className="text-2xl font-semibold">{activeQr}</p>
        </AppCard>
        <AppCard>
          <p className="text-xs text-[var(--color-text-muted)]">Alertas vecinales</p>
          <p className="text-2xl font-semibold">{activeAlerts}</p>
        </AppCard>
      </div>
    </div>
  )
}

export function AppVisitsPage() {
  const { qrPasses } = useDemoData()

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Visitas"
        description="Registro y seguimiento de invitados por QR."
      />
      <div className="space-y-2">
        {qrPasses.map((pass) => (
          <AppCard key={pass.id}>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{pass.label}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                    pass.type === 'temporary'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {pass.type === 'temporary' ? 'Temporal' : 'Permanente'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{pass.note}</p>
              <p className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                {pass.qrValue}
              </p>
              {pass.validUntil ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Vigencia: {pass.validUntil}
                </p>
              ) : null}
            </div>
          </AppCard>
        ))}
      </div>
    </div>
  )
}

export function AppPoolPage() {
  return (
    <ModulePlaceholder
      role="Residente / Inquilino"
      title="Alberca"
      description="Reservas y reglas operativas para amenidades."
    />
  )
}

export function AppIncidentsPage() {
  const { incidents, supportIncident, opposeIncident } = useDemoData()
  const sortedIncidents = [...incidents].sort((left, right) => {
    const leftScore = left.supports - left.opposes
    const rightScore = right.supports - right.opposes
    return rightScore - leftScore
  })

  const communalAlert = sortedIncidents.some(
    (incident) => incident.supports - incident.opposes >= 3,
  )

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Incidencias"
        description="Apoya (+1) o resta prioridad (-1). Las incidencias con mayor apoyo suben al inicio."
      />
      {communalAlert ? (
        <AppCard className="border-[var(--color-brand)]/40 bg-emerald-50">
          <p className="text-sm text-emerald-800">
            Alerta comunitaria activa: hay incidencias con apoyo alto. Se
            notificara a vecinos para reaccionar (+1/-1).
          </p>
        </AppCard>
      ) : null}
      <div className="space-y-2">
        {sortedIncidents.map((incident) => {
          const score = incident.supports - incident.opposes
          const priority = getIncidentPriority(incident)
          return (
            <AppCard
              className={priorityStyles(priority)}
              key={incident.id}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{incident.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {incident.zone} - {incident.createdAt}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                    {score >= 0 ? `+${score}` : score}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {incident.description}
                </p>
                <div className="flex gap-2">
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => supportIncident(incident.id)}
                    variant="primary"
                  >
                    +1 Apoyar ({incident.supports})
                  </AppButton>
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => opposeIncident(incident.id)}
                    variant="secondary"
                  >
                    -1 Restar ({incident.opposes})
                  </AppButton>
                </div>
              </div>
            </AppCard>
          )
        })}
      </div>
    </div>
  )
}

export function AppAnnouncementsPage() {
  const { incidents } = useDemoData()
  const escalated = incidents.filter(
    (incident) => incident.supports - incident.opposes >= 3,
  )

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Comunicados"
        description="Avisos operativos de administracion y comite."
      />
      <AppCard>
        <p className="text-sm font-semibold">Notificaciones comunitarias</p>
        {escalated.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Sin incidentes con apoyo alto por ahora.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {escalated.map((incident) => (
              <li key={incident.id} className="text-sm text-[var(--color-text-muted)]">
                Se solicita reaccion vecinal en "{incident.title}" ({incident.supports}
                + / {incident.opposes}-).
              </li>
            ))}
          </ul>
        )}
      </AppCard>
    </div>
  )
}

export function AppFinancePage() {
  return (
    <ModulePlaceholder
      role="Residente / Comite"
      title="Finanzas"
      description="Estado de cuenta, cuotas y transparencia financiera."
    />
  )
}

export function AppProfilePage() {
  return (
    <ModulePlaceholder
      role="Residente / Inquilino"
      title="Perfil"
      description="Datos de usuario, vivienda y preferencias."
    />
  )
}
