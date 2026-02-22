import { useEffect, useMemo, useState } from 'react'
import { AppButton, AppCard, ModulePlaceholder, PetPhoto } from '../../shared/ui'
import { useDemoData } from '../../shared/state/DemoDataContext'
import {
  canResolveIncident,
  formatCountdown,
  getSlaRemainingMs,
  isSlaOverdue,
  sortIncidentsForGuard,
} from '../incidents/logic'
import { findPassesByDepartmentSequence, getLast4Code } from '../access/qrLogic'
export { GuardPackagesPage } from '../packages/pages'

function guardIncidentEmphasis(score: number) {
  if (score >= 10) {
    return 'ring-2 ring-red-500 border-red-500/40 bg-red-950/30'
  }
  if (score >= 5) {
    return 'ring-2 ring-amber-500 border-amber-500/40 bg-amber-900/20'
  }
  return 'border-zinc-700 bg-zinc-900'
}

export function GuardScanPage() {
  const { qrPasses, handleGuardScanDecision, handleGuardDeliveryDecision } = useDemoData()
  const [departmentCode, setDepartmentCode] = useState('')
  const [sequenceCode, setSequenceCode] = useState('')
  const [note, setNote] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  const [deliveryFeedback, setDeliveryFeedback] = useState<Record<string, string>>({})
  const [scanHint, setScanHint] = useState('')
  const [approvedFlash, setApprovedFlash] = useState(false)

  const matches = useMemo(
    () => findPassesByDepartmentSequence(qrPasses, departmentCode, sequenceCode),
    [qrPasses, departmentCode, sequenceCode]
  )
  const currentPass = matches.length === 1 ? matches[0] : null
  const activeDeliveryPasses = useMemo(() => {
    const now = Date.now()
    return qrPasses
      .filter((pass) => {
        if (pass.type !== 'delivery_open' || pass.status !== 'active') {
          return false
        }
        if (!pass.endAt) {
          return true
        }
        const endAt = Date.parse(pass.endAt)
        return Number.isNaN(endAt) ? true : endAt >= now
      })
      .sort((a, b) => {
        const left = Date.parse(a.startAt ?? a.endAt ?? '')
        const right = Date.parse(b.startAt ?? b.endAt ?? '')
        return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left)
      })
  }, [qrPasses])

  function act(result: 'allow' | 'reject') {
    const response = handleGuardScanDecision({
      departmentCode,
      sequenceCode,
      result,
      note,
    })
    setResultMessage(response.message)
    if (response.ok) {
      if (result === 'allow') {
        setApprovedFlash(true)
        window.setTimeout(() => setApprovedFlash(false), 1200)
      }
      setDepartmentCode('')
      setSequenceCode('')
      setNote('')
    }
  }

  function actDelivery(passId: string, result: 'allow' | 'reject') {
    const response = handleGuardDeliveryDecision({
      passId,
      result,
      note,
    })
    setDeliveryFeedback((previous) => ({
      ...previous,
      [passId]: response.message,
    }))
    if (response.ok && result === 'allow') {
      setApprovedFlash(true)
      window.setTimeout(() => setApprovedFlash(false), 1200)
    }
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Escaneo de acceso"
        description='Usa "Scanear" o entrada manual por departamento y numero.'
      />
      <AppCard className="space-y-2 border-zinc-700 bg-zinc-900">
        <AppButton
          block
          className="py-3 text-base"
          onClick={() =>
            setScanHint('Scanear no disponible sin permisos de camara en este entorno.')
          }
          variant="secondary"
        >
          Scanear
        </AppButton>
        {scanHint ? <p className="text-xs text-zinc-300">{scanHint}</p> : null}

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-zinc-400">Manual entry</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setDepartmentCode(event.target.value.replace(/[^0-9]/g, ''))}
              pattern="[0-9]*"
              placeholder="Depto 1141"
              type="tel"
              value={departmentCode}
            />
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setSequenceCode(event.target.value.replace(/[^0-9]/g, ''))}
              pattern="[0-9]*"
              placeholder="Numero 0001"
              type="tel"
              value={sequenceCode}
            />
          </div>
        </label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota opcional"
          value={note}
        />
        <div className="flex gap-2">
          <AppButton
            className="px-3 py-2 text-xs"
            disabled={departmentCode.length !== 4 || sequenceCode.length !== 4}
            onClick={() => act('allow')}
          >
            Permitir
          </AppButton>
          <AppButton
            className="px-3 py-2 text-xs"
            disabled={departmentCode.length !== 4 || sequenceCode.length !== 4}
            onClick={() => act('reject')}
            variant="danger"
          >
            Rechazar
          </AppButton>
        </div>
        {resultMessage ? <p className="text-xs text-zinc-300">{resultMessage}</p> : null}
      </AppCard>
      {matches.length > 1 ? (
        <AppCard className="border-amber-500/50 bg-amber-900/20 text-amber-100">
          Colision: hay {matches.length} codigos con esa combinacion depto-numero.
        </AppCard>
      ) : null}
      {approvedFlash ? (
        <AppCard className="animate-pulse border-emerald-400 bg-emerald-500/20 text-emerald-100">
          Acceso aprobado.
        </AppCard>
      ) : null}
      {currentPass ? (
        <AppCard className="space-y-1 border-zinc-700 bg-zinc-900 text-zinc-100">
          <p className="text-sm font-semibold">{currentPass.label}</p>
          <p className="text-xs text-zinc-300">Unidad: {currentPass.unitId}</p>
          <p className="text-xs text-zinc-300">Estado: {currentPass.status}</p>
          <p className="text-xs text-zinc-300">
            Codigo: {currentPass.displayCode} (ultimos 4: {getLast4Code(currentPass.displayCode)})
          </p>
          <p className="text-xs text-zinc-300">
            Vigencia: {currentPass.startAt ?? '-'} / {currentPass.endAt ?? 'permanente'}
          </p>
          {currentPass.visitorPhotoUrl ? (
            <p className="text-xs text-zinc-300">Foto: {currentPass.visitorPhotoUrl}</p>
          ) : null}
        </AppCard>
      ) : null}
      <AppCard className="space-y-2 border-zinc-700 bg-zinc-900 text-zinc-100">
        <p className="text-sm font-semibold">Entregas activas (sin escaneo)</p>
        {activeDeliveryPasses.length === 0 ? (
          <p className="text-xs text-zinc-300">No hay entregas activas por el momento.</p>
        ) : (
          <div className="space-y-2">
            {activeDeliveryPasses.map((pass) => (
              <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2" key={pass.id}>
                <p className="text-sm font-semibold text-zinc-100">
                  {pass.deliveryProvider ? `Entrega ${pass.deliveryProvider}` : 'Entrega de paqueteria'}
                </p>
                <p className="text-xs text-zinc-300">Depto: {pass.unitId}</p>
                <p className="text-xs text-zinc-300">
                  Activa hasta: {pass.endAt ? new Date(pass.endAt).toLocaleString() : 'Sin limite'}
                </p>
                {pass.accessMessage ? (
                  <p className="text-xs text-zinc-400">Nota residente: {pass.accessMessage}</p>
                ) : null}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <AppButton className="px-3 py-2 text-xs" onClick={() => actDelivery(pass.id, 'allow')}>
                    Permitir entrega
                  </AppButton>
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => actDelivery(pass.id, 'reject')}
                    variant="danger"
                  >
                    Rechazar
                  </AppButton>
                </div>
                {deliveryFeedback[pass.id] ? (
                  <p className="mt-1 text-xs text-zinc-300">{deliveryFeedback[pass.id]}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  )
}

export function GuardLogbookPage() {
  const { auditLog } = useDemoData()

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Bitacora"
        description="Historial de auditoria de escaneos y acciones."
      />
      <div className="space-y-2">
        {auditLog.length === 0 ? (
          <AppCard className="border-slate-700 bg-slate-900 text-slate-200">
            Sin eventos registrados.
          </AppCard>
        ) : (
          auditLog
            .slice()
            .reverse()
            .map((entry) => (
              <AppCard className="border-slate-700 bg-slate-900 text-slate-100" key={entry.id}>
                <p className="text-sm font-semibold">
                  {entry.action} - {entry.result}
                </p>
                <p className="text-xs text-slate-300">
                  {new Date(entry.at).toLocaleString()} - target: {entry.targetId}
                </p>
                {entry.note ? <p className="text-xs text-slate-400">Nota: {entry.note}</p> : null}
              </AppCard>
            ))
        )}
      </div>
    </div>
  )
}

export function GuardIncidentsPage() {
  const {
    incidents,
    acknowledgeIncident,
    markIncidentInProgress,
    addGuardAction,
    resolveIncident,
  } = useDemoData()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [draftNote, setDraftNote] = useState<Record<string, string>>({})
  const [draftPhoto, setDraftPhoto] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const prioritized = useMemo(() => sortIncidentsForGuard(incidents, nowMs), [incidents, nowMs])

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Incidencias"
        description="Orden por SLA, prioridad y antiguedad. SLA = 15 minutos."
      />
      <div className="space-y-2">
        {prioritized.map((incident) => {
          const remaining = getSlaRemainingMs(incident, nowMs)
          const overdue = isSlaOverdue(incident, nowMs)
          const canResolve = canResolveIncident(incident)

          return (
            <AppCard className={guardIncidentEmphasis(incident.supportScore)} key={incident.id}>
              <div className="space-y-2 text-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{incident.title}</p>
                    <p className="text-xs text-slate-300">
                      SLA: {formatCountdown(remaining)} {overdue ? '(vencido)' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase">
                      {incident.priority}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] uppercase text-emerald-200">
                      {incident.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-200">{incident.description}</p>
                <p className="text-xs font-semibold text-slate-300">
                  Score vecinal: +{incident.supportScore}
                </p>
                {incident.supportScore >= 10 ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-red-300">
                    Alerta maxima: respuesta inmediata
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => acknowledgeIncident(incident.id)}
                    variant="secondary"
                  >
                    Acusar recibo
                  </AppButton>
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => markIncidentInProgress(incident.id)}
                  >
                    En progreso
                  </AppButton>
                </div>
                <textarea
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100"
                  onChange={(event) =>
                    setDraftNote((previous) => ({
                      ...previous,
                      [incident.id]: event.target.value,
                    }))
                  }
                  placeholder="Comentario de atencion"
                  rows={2}
                  value={draftNote[incident.id] ?? ''}
                />
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100"
                  onChange={(event) =>
                    setDraftPhoto((previous) => ({
                      ...previous,
                      [incident.id]: event.target.value,
                    }))
                  }
                  placeholder="photoUrl (opcional)"
                  value={draftPhoto[incident.id] ?? ''}
                />
                <div className="grid grid-cols-2 gap-2">
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => {
                      const ok = addGuardAction(incident.id, {
                        note: draftNote[incident.id],
                        photoUrl: draftPhoto[incident.id],
                      })
                      setFeedback((previous) => ({
                        ...previous,
                        [incident.id]: ok ? 'Evidencia guardada.' : 'Agrega comentario o photoUrl.',
                      }))
                      if (ok) {
                        setDraftNote((previous) => ({ ...previous, [incident.id]: '' }))
                        setDraftPhoto((previous) => ({ ...previous, [incident.id]: '' }))
                      }
                    }}
                    variant="secondary"
                  >
                    Guardar evidencia
                  </AppButton>
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => {
                      const result = resolveIncident(incident.id, {
                        note: draftNote[incident.id],
                        photoUrl: draftPhoto[incident.id],
                      })
                      setFeedback((previous) => ({
                        ...previous,
                        [incident.id]: result.message,
                      }))
                      if (result.ok) {
                        setDraftNote((previous) => ({ ...previous, [incident.id]: '' }))
                        setDraftPhoto((previous) => ({ ...previous, [incident.id]: '' }))
                      }
                    }}
                    variant={canResolve ? 'primary' : 'danger'}
                  >
                    Marcar terminado
                  </AppButton>
                </div>
                {feedback[incident.id] ? (
                  <p className="text-xs text-slate-300">{feedback[incident.id]}</p>
                ) : null}
              </div>
            </AppCard>
          )
        })}
      </div>
    </div>
  )
}

export function GuardParkingPage() {
  const { parkingReports, updateParkingReportStatus } = useDemoData()
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const pendingReports = parkingReports.filter((report) => report.status === 'open')
  const resolvedReports = parkingReports.filter((report) => report.status !== 'open')

  function handleStatusUpdate(
    reportId: string,
    status: 'owner_notified' | 'tow_truck_notified'
  ) {
    const result = updateParkingReportStatus({
      reportId,
      status,
      guardNote: draftNotes[reportId],
    })
    setFeedback((previous) => ({
      ...previous,
      [reportId]: result.ok ? 'Accion guardada.' : result.error ?? 'No fue posible actualizar.',
    }))
    if (result.ok) {
      setDraftNotes((previous) => ({ ...previous, [reportId]: '' }))
    }
  }

  function statusLabel(status: string) {
    if (status === 'owner_notified') {
      return 'Conductor notificado'
    }
    if (status === 'tow_truck_notified') {
      return 'Grua notificada'
    }
    return 'Pendiente'
  }

  function statusBadgeClass(status: string) {
    if (status === 'open') {
      return 'bg-amber-500/20 text-amber-200 border-amber-500/30'
    }
    if (status === 'owner_notified') {
      return 'bg-blue-500/20 text-blue-200 border-blue-500/30'
    }
    return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
  }

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Reportes de estacionamiento"
        description="Atiende reportes por cajon asignado del departamento."
      />
      <AppCard className="space-y-2 border-slate-700 bg-slate-900 text-slate-100">
        <p className="text-sm font-semibold">Pendientes</p>
        {pendingReports.length === 0 ? (
          <p className="text-xs text-slate-300">No hay reportes pendientes.</p>
        ) : (
          <div className="space-y-2">
            {pendingReports.map((report) => (
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-2" key={report.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {report.parkingSpot} - Depto {report.unitNumber}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusBadgeClass(report.status)}`}
                  >
                    Pendiente
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Tipo: {report.reportType === 'visitor_spot' ? 'Visitante' : 'Mi cajon'}
                </p>
                <p className="text-xs text-slate-300">{report.description}</p>
                <PetPhoto
                  alt="Evidencia del reporte"
                  className="mt-2 h-28 w-full rounded-xl border border-slate-700 object-cover"
                  pathOrUrl={report.photoUrl}
                />
                <p className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleString()}</p>
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                  onChange={(event) =>
                    setDraftNotes((previous) => ({ ...previous, [report.id]: event.target.value }))
                  }
                  placeholder="Nota opcional de atencion"
                  rows={2}
                  value={draftNotes[report.id] ?? ''}
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => handleStatusUpdate(report.id, 'owner_notified')}
                    variant="secondary"
                  >
                    Notifique al conductor
                  </AppButton>
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => handleStatusUpdate(report.id, 'tow_truck_notified')}
                    variant="danger"
                  >
                    Notifique a la grua
                  </AppButton>
                </div>
                {feedback[report.id] ? <p className="mt-1 text-xs text-slate-300">{feedback[report.id]}</p> : null}
              </div>
            ))}
          </div>
        )}
      </AppCard>
      <AppCard className="space-y-2 border-slate-700 bg-slate-900 text-slate-100">
        <p className="text-sm font-semibold">Atendidos</p>
        {resolvedReports.length === 0 ? (
          <p className="text-xs text-slate-300">Sin reportes atendidos todavia.</p>
        ) : (
          <div className="space-y-2">
            {resolvedReports.map((report) => (
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-2" key={report.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {report.parkingSpot} - {statusLabel(report.status)}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusBadgeClass(report.status)}`}
                  >
                    Atendido
                  </span>
                </div>
                <p className="text-xs text-slate-300">Depto {report.unitNumber}</p>
                <p className="text-xs text-slate-400">
                  Tipo: {report.reportType === 'visitor_spot' ? 'Visitante' : 'Mi cajon'}
                </p>
                <PetPhoto
                  alt="Evidencia del reporte"
                  className="mt-2 h-24 w-full rounded-xl border border-slate-700 object-cover"
                  pathOrUrl={report.photoUrl}
                />
                {report.guardNote ? <p className="text-xs text-slate-400">Nota: {report.guardNote}</p> : null}
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  )
}

export function GuardOfflinePage() {
  const { offlineQueue, enqueueManualOfflineValidation } = useDemoData()
  const [departmentCode, setDepartmentCode] = useState('')
  const [sequenceCode, setSequenceCode] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Modo offline"
        description="Validacion manual encola eventos locales para sincronizacion."
      />
      <AppCard className="space-y-2 border-amber-500/40 bg-amber-200/10">
        <input
          className="w-full rounded-lg border border-amber-600/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => setDepartmentCode(event.target.value.replace(/[^0-9]/g, ''))}
          pattern="[0-9]*"
          placeholder="Depto (1141)"
          type="tel"
          value={departmentCode}
        />
        <input
          className="w-full rounded-lg border border-amber-600/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => setSequenceCode(event.target.value.replace(/[^0-9]/g, ''))}
          pattern="[0-9]*"
          placeholder="Numero (4)"
          type="tel"
          value={sequenceCode}
        />
        <input
          className="w-full rounded-lg border border-amber-600/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota"
          value={note}
        />
        <div className="flex gap-2">
          <AppButton
            className="px-3 py-2 text-xs"
            disabled={departmentCode.length !== 4 || sequenceCode.length !== 4}
            onClick={() =>
              enqueueManualOfflineValidation({
                departmentCode,
                sequenceCode,
                result: 'allow',
                note,
              })
            }
            variant="secondary"
          >
            Encolar permitir
          </AppButton>
          <AppButton
            className="px-3 py-2 text-xs"
            disabled={departmentCode.length !== 4 || sequenceCode.length !== 4}
            onClick={() =>
              enqueueManualOfflineValidation({
                departmentCode,
                sequenceCode,
                result: 'reject',
                note,
              })
            }
            variant="danger"
          >
            Encolar rechazar
          </AppButton>
        </div>
      </AppCard>
      <AppCard className="border-slate-700 bg-slate-900 text-slate-100">
        <p className="text-sm font-semibold">offlineQueue</p>
        <p className="text-xs text-slate-300">
          Eventos pendientes: {offlineQueue.filter((event) => !event.synced).length}
        </p>
      </AppCard>
    </div>
  )
}
