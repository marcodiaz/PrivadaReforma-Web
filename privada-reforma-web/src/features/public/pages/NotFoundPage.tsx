import { Link } from 'react-router-dom'
import { AppButton, AppCard } from '../../../shared/ui'

export function NotFoundPage() {
  return (
    <AppCard className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        404
      </p>
      <h1 className="text-xl font-semibold text-[var(--color-text)]">Pagina no encontrada</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        La ruta que intentaste abrir no existe.
      </p>
      <Link to="/login">
        <AppButton block>Volver a login</AppButton>
      </Link>
    </AppCard>
  )
}
