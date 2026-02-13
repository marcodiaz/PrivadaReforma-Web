import { useEffect, useMemo, useState } from 'react'
import { AppButton, AppCard, ModulePlaceholder } from '../../shared/ui'
import { useDemoData } from '../../shared/state/DemoDataContext'
import {
  canResolveIncident,
  formatCountdown,
  getSlaRemainingMs,
  isSlaOverdue,
  sortIncidentsForGuard,
} from '../incidents/logic'
import {
  findPassesByDepartmentSequence,
  getLast4Code,
} from '../access/qrLogic'

function guardIncidentEmphasis(score: number) {
  if (score >= 10) {
    return 'ring-2 ring-red-500 border-red-500/40 bg-red-950/30'
  }
  if (score >= 5) {
    return 'ring-2 ring-amber-500 border-amber-500/40 bg-amber-900/20'
  }
  return 'border-slate-700 bg-slate-900'
}

export function GuardScanPage() {
  const { qrPasses, handleGuardScanDecision } = useDemoData()
  const [departmentCode, setDepartmentCode] = useState('')
  const [sequenceCode, setSequenceCode] = useState('')
  const [note, setNote] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  const [scanHint, setScanHint] = useState('')
  const [approvedFlash, setApprovedFlash] = useState(false)

  const matches = useMemo(
    () => findPassesByDepartmentSequence(qrPasses, departmentCode, sequenceCode),
    [qrPasses, departmentCode, sequenceCode],
  )
  const currentPass = matches.length === 1 ? matches[0] : null

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

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Escaneo de acceso"
        description='Usa "Scanear" o entrada manual por departamento y numero.'
      />
      <AppCard className="space-y-2 border-slate-700 bg-slate-900">
        <AppButton
          block
          className="py-3 text-base"
          onClick={() =>
            setScanHint(
              'Scanear no disponible sin permisos de camara en este entorno.',
            )
          }
          variant="secondary"
        >
          Scanear
        </AppButton>
        {scanHint ? <p className="text-xs text-slate-300">{scanHint}</p> : null}

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-slate-400">
            Manual entry
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) =>
                setDepartmentCode(event.target.value.replace(/[^0-9]/g, ''))
              }
              pattern="[0-9]*"
              placeholder="Depto 1141"
              type="tel"
              value={departmentCode}
            />
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) =>
                setSequenceCode(event.target.value.replace(/[^0-9]/g, ''))
              }
              pattern="[0-9]*"
              placeholder="Numero 0001"
              type="tel"
              value={sequenceCode}
            />
          </div>
        </label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
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
        {resultMessage ? (
          <p className="text-xs text-slate-300">{resultMessage}</p>
        ) : null}
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
        <AppCard className="space-y-1 border-slate-700 bg-slate-900 text-slate-100">
          <p className="text-sm font-semibold">{currentPass.label}</p>
          <p className="text-xs text-slate-300">Unidad: {currentPass.unitId}</p>
          <p className="text-xs text-slate-300">Estado: {currentPass.status}</p>
          <p className="text-xs text-slate-300">
            Codigo: {currentPass.displayCode} (ultimos 4: {getLast4Code(currentPass.displayCode)})
          </p>
          <p className="text-xs text-slate-300">
            Vigencia: {currentPass.startAt ?? '-'} / {currentPass.endAt ?? 'permanente'}
          </p>
          {currentPass.visitorPhotoUrl ? (
            <p className="text-xs text-slate-300">Foto: {currentPass.visitorPhotoUrl}</p>
          ) : null}
        </AppCard>
      ) : null}
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
                {entry.note ? (
                  <p className="text-xs text-slate-400">Nota: {entry.note}</p>
                ) : null}
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
                        [incident.id]: ok
                          ? 'Evidencia guardada.'
                          : 'Agrega comentario o photoUrl.',
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
          onChange={(event) =>
            setDepartmentCode(event.target.value.replace(/[^0-9]/g, ''))
          }
          pattern="[0-9]*"
          placeholder="Depto (1141)"
          type="tel"
          value={departmentCode}
        />
        <input
          className="w-full rounded-lg border border-amber-600/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) =>
            setSequenceCode(event.target.value.replace(/[^0-9]/g, ''))
          }
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
