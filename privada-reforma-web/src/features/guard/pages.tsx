import { AppCard, ModulePlaceholder } from '../../shared/ui'

export function GuardScanPage() {
  return (
    <ModulePlaceholder
      role="Guardia"
      title="Escaneo de acceso"
      description="Lectura rapida de QR para entradas y salidas."
    />
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
  return (
    <ModulePlaceholder
      role="Guardia"
      title="Incidencias"
      description="Captura inmediata de incidentes de seguridad."
    />
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
