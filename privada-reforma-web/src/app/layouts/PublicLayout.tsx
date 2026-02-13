import { Outlet } from 'react-router-dom'

export function PublicLayout() {
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
