import { useState } from 'react'
import { AppButton, AppCard, ModulePlaceholder } from '../../shared/ui'
import { useDemoData } from '../../shared/state/DemoDataContext'

export function GuardScanPage() {
  const { qrPasses } = useDemoData()
  const activePasses = qrPasses.filter((pass) => pass.status === 'active')

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Escaneo de acceso"
        description="Lectura rapida de QR para entradas y salidas."
      />
      <div className="space-y-2">
        {activePasses.map((pass) => (
          <AppCard className="border-slate-700 bg-slate-900" key={pass.id}>
            <div className="space-y-1 text-slate-100">
              <p className="text-sm font-semibold">{pass.label}</p>
              <p className="text-xs text-slate-300">
                Tipo: {pass.type === 'temporary' ? 'Temporal' : 'Permanente'}
              </p>
              <p className="rounded-md bg-slate-800 px-2 py-1 font-mono text-xs">
                {pass.qrValue}
              </p>
              {pass.validUntil ? (
                <p className="text-xs text-slate-400">Vence: {pass.validUntil}</p>
              ) : null}
            </div>
          </AppCard>
        ))}
      </div>
    </div>
  )
}

export function GuardLogbookPage() {
  return (
    <ModulePlaceholder
      role="Guardia"
      title="Bitacora"
      description="Registro cronologico de eventos operativos."
    />
  )
}

export function GuardIncidentsPage() {
  const { incidents, markIncidentInProgress, addGuardComment } = useDemoData()
  const [draftComments, setDraftComments] = useState<Record<string, string>>({})
  const prioritized = [...incidents].sort((left, right) => {
    const leftScore = left.supports - left.opposes
    const rightScore = right.supports - right.opposes
    return rightScore - leftScore
  })

  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Incidencias"
        description="Atiende primero las incidencias con mayor apoyo vecinal."
      />
      <div className="space-y-2">
        {prioritized.map((incident, index) => {
          const score = incident.supports - incident.opposes
          return (
            <AppCard className="border-slate-700 bg-slate-900" key={incident.id}>
              <div className="space-y-2 text-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {index === 0 ? 'Prioridad #1 - ' : ''}
                      {incident.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {incident.zone} - score {score >= 0 ? `+${score}` : score}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-200">
                    {incident.status}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{incident.description}</p>
                <div className="flex gap-2">
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => markIncidentInProgress(incident.id)}
                    variant="primary"
                  >
                    Atender rapido
                  </AppButton>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Comentario de guardia
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100"
                    onChange={(event) =>
                      setDraftComments((previous) => ({
                        ...previous,
                        [incident.id]: event.target.value,
                      }))
                    }
                    placeholder="Ejemplo: zona acordonada y aviso a administracion."
                    rows={2}
                    value={draftComments[incident.id] ?? ''}
                  />
                  <AppButton
                    className="px-3 py-2 text-xs"
                    onClick={() => {
                      addGuardComment(incident.id, draftComments[incident.id] ?? '')
                      setDraftComments((previous) => ({
                        ...previous,
                        [incident.id]: '',
                      }))
                    }}
                    variant="secondary"
                  >
                    Guardar comentario
                  </AppButton>
                </div>
                {incident.guardComments.length > 0 ? (
                  <ul className="space-y-1 rounded-lg bg-slate-800 p-2 text-xs text-slate-200">
                    {incident.guardComments.map((comment) => (
                      <li key={`${incident.id}-${comment}`}>- {comment}</li>
                    ))}
                  </ul>
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
  return (
    <div className="space-y-3">
      <ModulePlaceholder
        role="Guardia"
        title="Modo offline"
        description="La app mantiene el shell y recursos estaticos en cache para seguir operando sin red."
      />
      <AppCard className="border-amber-500/40 bg-amber-200/10">
        <p className="text-sm text-amber-100">
          Si no hay internet, captura eventos en bitacora local y sincroniza al
          recuperar conexion.
        </p>
      </AppCard>
    </div>
  )
}
