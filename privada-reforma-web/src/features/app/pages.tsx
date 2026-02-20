import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppButton, AppCard, ModulePlaceholder } from '../../shared/ui'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { sortIncidentsForGuard } from '../incidents/logic'
import type { Incident } from '../../shared/domain/demoData'
import {
  buildQrImageUrl,
  buildQrPayload,
  getLast4Code,
  normalizeDepartmentCode,
} from '../access/qrLogic'
export { AppPackagesPage } from '../packages/pages'

function priorityBadge(priority: Incident['priority']) {
  if (priority === 'high') {
    return 'bg-red-100 text-red-700'
  }
  if (priority === 'medium') {
    return 'bg-amber-100 text-amber-700'
  }
  return 'bg-slate-100 text-slate-700'
}

function incidentEmphasis(score: number) {
  if (score >= 10) {
    return 'ring-2 ring-red-500 border-red-500/40 bg-red-50'
  }
  if (score >= 5) {
    return 'ring-2 ring-amber-500 border-amber-500/40 bg-amber-50'
  }
  return ''
}

export function AppHomePage() {
  const { incidents, qrPasses, auditLog, parkingReports, session } = useDemoData()
  const navigate = useNavigate()
  const activeAlerts = incidents.filter((incident) => incident.supportScore >= 3).length
  const activeQr = qrPasses.filter((pass) => pass.status === 'active').length
  const activeParkingReports = parkingReports.filter((report) => report.status === 'open').length
  const profileTitle = `${session?.fullName ?? 'Usuario'} - ${session?.unitNumber ?? 'Sin departamento'}`
  const menuItems = [
    { label: 'Estado de Cuenta', icon: 'EC', action: () => navigate('/app/finance') },
    { label: 'Comunicados', icon: 'CO', action: () => navigate('/app/announcements') },
    { label: 'Visitas', icon: 'VI', action: () => navigate('/app/visits') },
    { label: 'Reservaciones', icon: 'RE', action: () => navigate('/app/reservations') },
    { label: 'Estacionamiento', icon: 'ES', action: () => navigate('/app/parking') },
    { label: 'Paquetes', icon: 'PA', action: () => navigate('/app/packages') },
    { label: 'Incidencias', icon: 'IN', action: () => navigate('/app/incidents') },
    { label: 'Perfil', icon: 'PE', action: () => navigate('/app/profile') },
  ]

  return (
    <div className="space-y-4">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title={profileTitle}
        description="Accesos, comunicados y modulos principales."
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center">
          <p className="text-[11px] uppercase text-slate-400">QR activos</p>
          <p className="text-2xl font-bold text-white">{activeQr}</p>
        </AppCard>
        <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center">
          <p className="text-[11px] uppercase text-slate-400">Alertas</p>
          <p className="text-2xl font-bold text-white">{activeAlerts}</p>
        </AppCard>
        <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center">
          <p className="text-[11px] uppercase text-slate-400">Auditoria</p>
          <p className="text-2xl font-bold text-white">{auditLog.length}</p>
        </AppCard>
        <AppCard className="rounded-xl border-zinc-800 bg-zinc-950 p-3 text-center">
          <p className="text-[11px] uppercase text-slate-400">Parking</p>
          <p className="text-2xl font-bold text-white">{activeParkingReports}</p>
        </AppCard>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {menuItems.map((item) => (
          <button key={item.label} onClick={item.action} type="button">
            <AppCard className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border-zinc-800 bg-zinc-950 transition hover:-translate-y-0.5 hover:border-zinc-500">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-[linear-gradient(180deg,_#2a2a2a,_#1a1a1a)] text-xs font-bold tracking-[0.14em] text-zinc-100">
                {item.icon}
              </span>
              <span className="text-center text-sm font-medium tracking-[-0.01em] text-slate-100">
                {item.label}
              </span>
            </AppCard>
          </button>
        ))}
      </div>
    </div>
  )
}

export function AppVisitsPage() {
  const { qrPasses, createQrPass, deleteQrPass, debtMode, session } = useDemoData()
  const [visitorName, setVisitorName] = useState('MARCO')
  const [unitId, setUnitId] = useState('1141')
  const [accessType, setAccessType] = useState<'temporal' | 'time_limit'>('temporal')
  const [timeLimit, setTimeLimit] = useState<'week' | 'month' | 'permanent'>('week')
  const [maxUses, setMaxUses] = useState(1)
  const [maxPersons, setMaxPersons] = useState(1)
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [visitorPhotoUrl, setVisitorPhotoUrl] = useState('')
  const [accessMessage, setAccessMessage] = useState('')
  const [message, setMessage] = useState('')
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState('')
  const accountDepartmentCode = normalizeDepartmentCode(session?.unitNumber ?? '').slice(0, 4)

  const selectedQr = qrPasses.find((pass) => pass.id === selectedQrId) ?? null
  const selectedQrPayload = useMemo(() => {
    if (!selectedQr) {
      return ''
    }
    return buildQrPayload({
      id: selectedQr.id,
      displayCode: selectedQr.displayCode,
      qrValue: selectedQr.qrValue,
      unitId: selectedQr.unitId,
      status: selectedQr.status,
      type: selectedQr.type,
      endAt: selectedQr.endAt,
      visitorName: selectedQr.visitorName,
      maxPersons: selectedQr.maxPersons,
    })
  }, [selectedQr])
  const selectedQrImageUrl = selectedQr ? buildQrImageUrl(selectedQrPayload, 440) : ''

  function handleCreateQr() {
    const normalizedVisitorName = visitorName.trim().toUpperCase()
    const result = createQrPass({
      label: `Visita: ${normalizedVisitorName || 'VISITANTE'}`,
      unitId,
      departmentCode: accountDepartmentCode,
      visitorName: normalizedVisitorName,
      maxUses,
      maxPersons,
      accessMessage:
        accessMessage.trim() ||
        `Hola. Este es tu codigo de acceso: [${accountDepartmentCode}] para la fecha ${visitDate}.`,
      accessType,
      timeLimit: accessType === 'time_limit' ? timeLimit : undefined,
      visitorPhotoUrl: visitorPhotoUrl || undefined,
    })
    setMessage(result.ok ? 'QR creado correctamente.' : result.error ?? 'Error.')
    if (result.ok) {
      setAccessMessage('')
      setVisitorPhotoUrl('')
    }
  }

  async function handleCopyPayload() {
    if (!selectedQrPayload) {
      return
    }
    try {
      await navigator.clipboard.writeText(selectedQrPayload)
      setCopyMessage('Link de acceso copiado.')
    } catch {
      setCopyMessage('No fue posible copiar en este dispositivo.')
    }
    window.setTimeout(() => setCopyMessage(''), 2200)
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Visitantes"
        description="Registro programado y codigos QR para acceso."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Reg. Visita Programada</p>
        {debtMode ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            debtMode activo: la creacion de QR esta bloqueada.
          </p>
        ) : null}
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
            Nombre del visitante
          </span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            onChange={(event) => setVisitorName(event.target.value)}
            placeholder="Ej. Juan Perez"
            value={visitorName}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
            Unidad / Depto
          </span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            onChange={(event) => setUnitId(event.target.value)}
            placeholder="11-41"
            value={unitId}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
            Codigo departamento
          </span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            disabled
            placeholder="Sin departamento"
            readOnly
            value={accountDepartmentCode}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              Temporalidad
            </span>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              onChange={(event) => setAccessType(event.target.value as 'temporal' | 'time_limit')}
              value={accessType}
            >
              <option value="temporal">Fecha unica</option>
              <option value="time_limit">Con vigencia</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              Fecha
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              onChange={(event) => setVisitDate(event.target.value)}
              type="date"
              value={visitDate}
            />
          </label>
        </div>
        {accessType === 'time_limit' ? (
          <>
            <label className="space-y-1">
              <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
                Vigencia
              </span>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
                onChange={(event) =>
                  setTimeLimit(event.target.value as 'week' | 'month' | 'permanent')
                }
                value={timeLimit}
              >
                <option value="week">1 semana</option>
                <option value="month">1 mes</option>
                <option value="permanent">Permanente</option>
              </select>
            </label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              onChange={(event) => setVisitorPhotoUrl(event.target.value)}
              placeholder="visitorPhotoUrl (requerido para 1 mes/permanente)"
              value={visitorPhotoUrl}
            />
          </>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              Max. usos
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              min={1}
              onChange={(event) => setMaxUses(Math.max(1, Number(event.target.value) || 1))}
              type="number"
              value={maxUses}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              Max. personas
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
              min={1}
              onChange={(event) => setMaxPersons(Math.max(1, Number(event.target.value) || 1))}
              type="number"
              value={maxPersons}
            />
          </label>
        </div>
        <textarea
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
          onChange={(event) => setAccessMessage(event.target.value)}
          placeholder="Mensaje opcional para compartir"
          rows={2}
          value={accessMessage}
        />
        <AppButton block onClick={handleCreateQr}>
          Registrar
        </AppButton>
        {message ? <p className="text-xs text-slate-300">{message}</p> : null}
      </AppCard>
      <div className="space-y-2">
        {qrPasses.map((pass) => (
          <button
            className="block w-full text-left"
            key={pass.id}
            onClick={() => setSelectedQrId(pass.id)}
            type="button"
          >
            <AppCard className="border-slate-700 bg-slate-900 hover:border-[var(--color-brand)]/50">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{pass.visitorName ?? pass.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-700">
                    {pass.type === 'single_use' ? 'Temporal' : 'Time limit'}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Unidad: {pass.unitId} - Estado: {pass.status}
                </p>
                <p className="text-xs font-semibold text-slate-300">
                  Codigo: {pass.displayCode} (ultimos 4: {getLast4Code(pass.displayCode)})
                </p>
              </div>
            </AppCard>
          </button>
        ))}
      </div>
      {selectedQr ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <header className="mb-2 rounded-xl bg-zinc-900 px-3 py-2 text-center">
              <p className="text-xl font-semibold text-white">Residencia QR</p>
            </header>
            <AppCard className="space-y-2 border-slate-300 bg-slate-100">
              <img
                alt="Codigo QR de acceso"
                className="mx-auto w-full max-w-[320px] rounded-lg bg-white p-3"
                src={selectedQrImageUrl}
              />
              <p className="text-center text-xl font-bold text-zinc-900">
                {selectedQr.visitorName ?? 'VISITA'}
              </p>
              <p className="text-center text-sm font-semibold text-slate-600">
                {new Date().toLocaleDateString()} - Max. Personas: {selectedQr.maxPersons ?? 1}
              </p>
              <p className="rounded-lg bg-zinc-200 px-3 py-2 text-center text-sm text-slate-700">
                {selectedQr.accessMessage ??
                  `Hola. Este es tu codigo de acceso: ${selectedQr.displayCode} [Depto. ${selectedQr.unitId}].`}
              </p>
              <p className="rounded-lg bg-white px-2 py-1 text-center text-xs font-mono text-slate-700">
                Token: {selectedQr.qrValue}
              </p>
              {copyMessage ? <p className="text-center text-xs text-slate-500">{copyMessage}</p> : null}
              <AppButton block onClick={handleCopyPayload} variant="secondary">
                Copiar Link De Acceso
              </AppButton>
              <div className="grid grid-cols-2 gap-2">
                <AppButton onClick={() => setSelectedQrId(null)} variant="secondary">
                  Cerrar
                </AppButton>
                <AppButton
                  onClick={() => {
                    deleteQrPass(selectedQr.id)
                    setSelectedQrId(null)
                  }}
                  variant="danger"
                >
                  Borrar QR
                </AppButton>
              </div>
            </AppCard>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AppPoolPage() {
  const { createReservation, getActiveReservations, session } = useDemoData()
  const [amenity, setAmenity] = useState('Terraza')
  const [reservationDate, setReservationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState('')
  const activeReservations = getActiveReservations()

  function handleReserve() {
    const result = createReservation({ amenity, reservationDate })
    setMessage(result.ok ? 'Reservacion registrada.' : result.error ?? 'No se pudo reservar.')
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Reservaciones"
        description="Solo viernes/sabado. Cuota fija por reservacion: $5,000 MXN."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Nueva reservacion</p>
        <p className="text-xs text-zinc-400">Departamento: {session?.unitNumber ?? 'Sin departamento'}</p>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">Amenidad</span>
          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            onChange={(event) => setAmenity(event.target.value)}
            value={amenity}
          >
            <option value="Terraza">Terraza</option>
            <option value="Salon de eventos">Salon de eventos</option>
            <option value="Asador">Asador</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-zinc-400">Fecha</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            onChange={(event) => setReservationDate(event.target.value)}
            type="date"
            value={reservationDate}
          />
        </label>
        <p className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
          Fee de reservacion: <strong>$5,000 MXN</strong>
        </p>
        <AppButton block onClick={handleReserve}>
          Reservar
        </AppButton>
        {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
      </AppCard>
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Reservaciones activas (toda la privada)</p>
        {activeReservations.length === 0 ? (
          <p className="text-sm text-zinc-400">No hay reservaciones activas.</p>
        ) : (
          <div className="space-y-2">
            {activeReservations.map((reservation) => (
              <div
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
                key={reservation.id}
              >
                <p className="text-sm font-semibold text-zinc-100">
                  {reservation.amenity} - {reservation.reservationDate}
                </p>
                <p className="text-xs text-zinc-400">
                  Depto: {reservation.unitNumber} | Fee: ${reservation.fee.toLocaleString('es-MX')} MXN
                </p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  )
}

export function AppParkingPage() {
  const { createParkingReport, getAssignedParkingForUnit, parkingReports, session } = useDemoData()
  const [description, setDescription] = useState('Vehiculo no autorizado ocupando mi lugar.')
  const [message, setMessage] = useState('')
  const myUnit = session?.unitNumber
  const mySpot = getAssignedParkingForUnit(myUnit)
  const myReports = parkingReports.filter((report) => report.unitNumber === myUnit)

  function handleCreateReport() {
    const result = createParkingReport({ description })
    setMessage(result.ok ? 'Reporte enviado a guardia.' : result.error ?? 'No se pudo enviar.')
    if (result.ok) {
      setDescription('Vehiculo no autorizado ocupando mi lugar.')
    }
  }

  function statusLabel(status: string) {
    if (status === 'open') {
      return 'Pendiente de atencion'
    }
    if (status === 'owner_notified') {
      return 'Guardia notifico al conductor'
    }
    return 'Guardia notifico a la grua'
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Estacionamiento"
        description="Reporta directamente a guardia solo sobre tu cajon asignado."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Nuevo reporte</p>
        <p className="text-xs text-zinc-400">Departamento: {myUnit ?? 'Sin departamento'}</p>
        <p className="text-xs text-zinc-400">Cajon asignado (auto): {mySpot}</p>
        <textarea
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          value={description}
        />
        <AppButton block onClick={handleCreateReport}>
          Reportar a guardia
        </AppButton>
        {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
      </AppCard>
      <AppCard className="space-y-2 border-zinc-800 bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-100">Mis reportes</p>
        {myReports.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin reportes por ahora.</p>
        ) : (
          <div className="space-y-2">
            {myReports.map((report) => (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2" key={report.id}>
                <p className="text-sm font-semibold text-zinc-100">{report.parkingSpot}</p>
                <p className="text-xs text-zinc-300">{report.description}</p>
                <p className="text-xs text-zinc-400">{statusLabel(report.status)}</p>
                {report.guardNote ? <p className="text-xs text-zinc-400">Nota: {report.guardNote}</p> : null}
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  )
}

export function AppIncidentsPage() {
  const { incidents, updateVote, createIncident, session } = useDemoData()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Incident['category']>('other')
  const [priority, setPriority] = useState<Incident['priority']>('medium')
  const [message, setMessage] = useState('')

  const sortedIncidents = useMemo(() => sortIncidentsForGuard(incidents), [incidents])
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
            <AppCard className={incidentEmphasis(incident.supportScore)} key={incident.id}>
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
                {incident.supportScore >= 10 ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-red-700">
                    Prioridad critica comunitaria
                  </p>
                ) : null}
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
                {incident.title}: score {incident.supportScore}. Abre Incidencias para apoyar
                (+1/-1).
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
  const { session } = useDemoData()

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Residente / Inquilino"
        title="Perfil"
        description="Preferencias de usuario (base inicial)."
      />
      <AppCard className="space-y-3 border-zinc-800 bg-zinc-950">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">Nombre</p>
          <p className="text-sm font-semibold text-zinc-100">{session?.fullName ?? '-'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">Correo</p>
          <p className="text-sm font-semibold text-zinc-100">{session?.email ?? '-'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">Departamento</p>
          <p className="text-sm font-semibold text-zinc-100">{session?.unitNumber ?? '-'}</p>
        </div>
      </AppCard>
    </div>
  )
}
