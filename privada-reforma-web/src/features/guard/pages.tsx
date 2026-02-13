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

export function GuardScanPage() {
  const { qrPasses, handleGuardScanDecision } = useDemoData()
  const [qrValue, setQrValue] = useState('')
  const [note, setNote] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  const [selectedQr, setSelectedQr] = useState('')

  function resolvePreview() {
    const pass = qrPasses.find((entry) => entry.qrValue === qrValue.trim())
    setSelectedQr(pass?.id ?? '')
  }

  function act(result: 'allow' | 'reject') {
    const response = handleGuardScanDecision({ qrValue, result, note })
    setResultMessage(response.message)
    if (response.ok) {
      setNote('')
      setQrValue('')
      setSelectedQr('')
    }
  }

  const currentPass = qrPasses.find((entry) => entry.id === selectedQr)

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Escaneo de acceso"
        description="Validacion QR con resultado auditado (permitir/rechazar)."
      />
      <AppCard className="space-y-2 border-slate-700 bg-slate-900">
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          onBlur={resolvePreview}
          onChange={(event) => setQrValue(event.target.value)}
          placeholder="Pegar qrValue"
          value={qrValue}
        />
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota opcional"
          value={note}
        />
        <div className="flex gap-2">
          <AppButton className="px-3 py-2 text-xs" onClick={() => act('allow')}>
            Permitir
          </AppButton>
          <AppButton
            className="px-3 py-2 text-xs"
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
      {currentPass ? (
        <AppCard className="space-y-1 border-slate-700 bg-slate-900 text-slate-100">
          <p className="text-sm font-semibold">{currentPass.label}</p>
          <p className="text-xs text-slate-300">Unidad: {currentPass.unitId}</p>
          <p className="text-xs text-slate-300">Estado: {currentPass.status}</p>
          <p className="text-xs text-slate-300">
            Vigencia: {currentPass.startAt ?? '-'} / {currentPass.endAt ?? '-'}
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
            <AppCard
              className={`border-slate-700 bg-slate-900 ${overdue ? 'ring-2 ring-red-500' : ''}`}
              key={incident.id}
            >
              <div className="space-y-2 text-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{incident.title}</p>
                    <p className="text-xs text-slate-400">
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
                <p className="text-sm text-slate-300">{incident.description}</p>
                <p className="text-xs text-slate-400">Score: {incident.supportScore}</p>
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
                  placeholder="Accion ejecutada (nota)"
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
                      addGuardAction(incident.id, {
                        note: draftNote[incident.id],
                        photoUrl: draftPhoto[incident.id],
                      })
                      setDraftNote((previous) => ({ ...previous, [incident.id]: '' }))
                      setDraftPhoto((previous) => ({ ...previous, [incident.id]: '' }))
                    }}
                    variant="secondary"
                  >
                    Guardar evidencia
                  </AppButton>
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => resolveIncident(incident.id)}
                    variant={canResolve ? 'primary' : 'danger'}
                  >
                    {canResolve ? 'Resolver' : 'Falta evidencia'}
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

export function GuardOfflinePage() {
  const { offlineQueue, enqueueManualOfflineValidation } = useDemoData()
  const [qrValue, setQrValue] = useState('')
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
          onChange={(event) => setQrValue(event.target.value)}
          placeholder="qrValue manual"
          value={qrValue}
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
            onClick={() =>
              enqueueManualOfflineValidation({ qrValue, result: 'allow', note })
            }
            variant="secondary"
          >
            Encolar permitir
          </AppButton>
          <AppButton
            className="px-3 py-2 text-xs"
            onClick={() =>
              enqueueManualOfflineValidation({ qrValue, result: 'reject', note })
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
