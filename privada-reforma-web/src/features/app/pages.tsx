import { useMemo, useState } from 'react'
import { AppButton, AppCard, ModulePlaceholder } from '../../shared/ui'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { sortIncidentsForGuard } from '../incidents/logic'
import type { Incident } from '../../shared/domain/demoData'

function priorityBadge(priority: Incident['priority']) {
  if (priority === 'high') {
    return 'bg-red-100 text-red-700'
  }
  if (priority === 'medium') {
    return 'bg-amber-100 text-amber-700'
  }
  return 'bg-slate-100 text-slate-700'
}

export function AppHomePage() {
  const { incidents, qrPasses, auditLog } = useDemoData()
  const activeAlerts = incidents.filter((incident) => incident.supportScore >= 3).length
  const activeQr = qrPasses.filter((pass) => pass.status === 'active').length

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Inicio"
        description="Resumen operativo, accesos y actividad de seguridad."
      />
      <div className="grid grid-cols-3 gap-3">
        <AppCard>
          <p className="text-xs text-[var(--color-text-muted)]">QR activos</p>
          <p className="text-2xl font-semibold">{activeQr}</p>
        </AppCard>
        <AppCard>
          <p className="text-xs text-[var(--color-text-muted)]">Alertas</p>
          <p className="text-2xl font-semibold">{activeAlerts}</p>
        </AppCard>
        <AppCard>
          <p className="text-xs text-[var(--color-text-muted)]">Auditoria</p>
          <p className="text-2xl font-semibold">{auditLog.length}</p>
        </AppCard>
      </div>
    </div>
  )
}

export function AppVisitsPage() {
  const { qrPasses, createQrPass, debtMode } = useDemoData()
  const [label, setLabel] = useState('Visita temporal: tecnico')
  const [type, setType] = useState<'single_use' | 'time_window'>('single_use')
  const [unitId, setUnitId] = useState('Casa 17')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [visitorPhotoUrl, setVisitorPhotoUrl] = useState('')
  const [message, setMessage] = useState('')

  function handleCreateQr() {
    const result = createQrPass({
      label,
      unitId,
      type,
      startAt: startAt || undefined,
      endAt: endAt || undefined,
      visitorPhotoUrl: visitorPhotoUrl || undefined,
    })
    setMessage(result.ok ? 'QR creado correctamente.' : result.error ?? 'Error.')
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Visitas"
        description="Generacion de QR con reglas de seguridad y trazabilidad."
      />
      <AppCard className="space-y-2">
        <p className="text-sm font-semibold">Crear nuevo QR</p>
        {debtMode ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            debtMode activo: la creacion de QR esta bloqueada.
          </p>
        ) : null}
        <input
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Etiqueta"
          value={label}
        />
        <input
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          onChange={(event) => setUnitId(event.target.value)}
          placeholder="Unidad"
          value={unitId}
        />
        <select
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          onChange={(event) => setType(event.target.value as 'single_use' | 'time_window')}
          value={type}
        >
          <option value="single_use">single_use</option>
          <option value="time_window">time_window</option>
        </select>
        {type === 'time_window' ? (
          <>
            <input
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              onChange={(event) => setStartAt(event.target.value)}
              placeholder="startAt ISO"
              value={startAt}
            />
            <input
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              onChange={(event) => setEndAt(event.target.value)}
              placeholder="endAt ISO"
              value={endAt}
            />
            <input
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              onChange={(event) => setVisitorPhotoUrl(event.target.value)}
              placeholder="visitorPhotoUrl (opcional)"
              value={visitorPhotoUrl}
            />
          </>
        ) : null}
        <AppButton block onClick={handleCreateQr}>
          Crear QR
        </AppButton>
        {message ? (
          <p className="text-xs text-[var(--color-text-muted)]">{message}</p>
        ) : null}
      </AppCard>
      <div className="space-y-2">
        {qrPasses.map((pass) => (
          <AppCard key={pass.id}>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{pass.label}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-700">
                  {pass.type}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Unidad: {pass.unitId} - Estado: {pass.status}
              </p>
              <p className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                {pass.qrValue}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Codigo: {pass.displayCode}
              </p>
              {pass.visitorPhotoUrl ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Foto: {pass.visitorPhotoUrl}
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
  const { incidents, updateVote, createIncident, session } = useDemoData()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Incident['category']>('other')
  const [priority, setPriority] = useState<Incident['priority']>('medium')
  const [message, setMessage] = useState('')

  const sortedIncidents = useMemo(
    () => sortIncidentsForGuard(incidents),
    [incidents],
  )
  const communalAlert = sortedIncidents.some((incident) => incident.supportScore >= 3)

  function handleCreateIncident() {
    if (!title.trim() || !description.trim()) {
      setMessage('Titulo y descripcion son obligatorios.')
      return
    }
    const ok = createIncident({ title, description, category, priority })
    setMessage(ok ? 'Incidencia creada.' : 'No fue posible crear incidencia.')
    if (ok) {
      setTitle('')
      setDescription('')
      setCategory('other')
      setPriority('medium')
    }
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Incidencias"
        description="Voto comunitario +1/-1 con score unico por usuario."
      />
      <AppCard className="space-y-2">
        <p className="text-sm font-semibold">Nueva incidencia</p>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titulo"
          value={title}
        />
        <textarea
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Descripcion"
          rows={3}
          value={description}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            onChange={(event) => setCategory(event.target.value as Incident['category'])}
            value={category}
          >
            <option value="noise">noise</option>
            <option value="pets">pets</option>
            <option value="rules">rules</option>
            <option value="other">other</option>
          </select>
          <select
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            onChange={(event) => setPriority(event.target.value as Incident['priority'])}
            value={priority}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
        <AppButton block onClick={handleCreateIncident}>
          Crear incidencia
        </AppButton>
        {message ? <p className="text-xs text-[var(--color-text-muted)]">{message}</p> : null}
      </AppCard>
      {communalAlert ? (
        <AppCard className="border-[var(--color-brand)]/40 bg-emerald-50">
          <p className="text-sm text-emerald-800">
            Alerta comunitaria activa: incidencias con score alto se notifican a vecinos.
          </p>
        </AppCard>
      ) : null}
      <div className="space-y-2">
        {sortedIncidents.map((incident) => {
          const myVote = incident.votes.find((vote) => vote.userId === session?.userId)?.value
          return (
            <AppCard key={incident.id}>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{incident.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(incident.createdAt).toLocaleString()} - {incident.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${priorityBadge(incident.priority)}`}
                    >
                      {incident.priority}
                    </span>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                      {incident.supportScore >= 0
                        ? `+${incident.supportScore}`
                        : incident.supportScore}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{incident.description}</p>
                <div className="flex gap-2">
                  <AppButton
                    className={`px-3 py-2 text-xs ${myVote === 1 ? 'ring-2 ring-emerald-400' : ''}`}
                    onClick={() => updateVote(incident.id, 1)}
                    variant="primary"
                  >
                    +1 Apoyar
                  </AppButton>
                  <AppButton
                    className={`px-3 py-2 text-xs ${myVote === -1 ? 'ring-2 ring-amber-500' : ''}`}
                    onClick={() => updateVote(incident.id, -1)}
                    variant="secondary"
                  >
                    -1 Restar
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
  const escalated = incidents.filter((incident) => incident.supportScore >= 3)

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Comunicados"
        description="Alertas vecinales por score de incidencias."
      />
      <AppCard>
        <p className="text-sm font-semibold">Notificaciones comunitarias</p>
        {escalated.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Sin incidentes con score alto por ahora.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {escalated.map((incident) => (
              <li key={incident.id} className="text-sm text-[var(--color-text-muted)]">
                {incident.title}: score {incident.supportScore}. Abre Incidencias para
                apoyar (+1/-1).
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
