import { Outlet } from 'react-router-dom'
import { useDemoData } from '../../shared/state/DemoDataContext'

function AuthLoadingShell() {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)] px-4 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-sm items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
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
    <div className="min-h-dvh bg-[var(--color-bg)] px-4 pb-8 pt-6">
      <div className="mx-auto w-full max-w-sm space-y-3">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          Privada Reforma
        </p>
        <Outlet />
      </div>
    </div>
  )
}
