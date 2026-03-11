import { Outlet } from 'react-router-dom'
import { useDemoData } from '../../shared/state/DemoDataContext'

function AuthLoadingShell() {
  return (
    <div className="app-shell-gradient min-h-dvh bg-[var(--color-bg)] px-4 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-sm items-center justify-center rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--color-shadow)]">
        <p className="text-sm text-[var(--color-text-muted)]">Validando sesion...</p>
      </div>
    </div>
  )
}

export function PublicLayout() {
  const { authLoading } = useDemoData()

  if (authLoading) {
    return <AuthLoadingShell />
  }

  return (
    <div className="app-shell-gradient min-h-dvh bg-[var(--color-bg)] px-4 pb-8 pt-6">
      <div className="mx-auto w-full max-w-sm space-y-4">
        <div className="space-y-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brand)]">
            Privada Reforma
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
            Residence OS
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Operacion residencial con tono editorial, acceso seguro y workflows moviles.
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
