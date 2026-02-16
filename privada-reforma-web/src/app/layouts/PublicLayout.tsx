import { Navigate, Outlet } from 'react-router-dom'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { getRoleLandingPath } from '../../shared/domain/auth'

export function PublicLayout() {
  const { authLoading, session } = useDemoData()

  if (authLoading) {
    return null
  }

  if (session) {
    return <Navigate to={getRoleLandingPath(session.role)} replace />
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
