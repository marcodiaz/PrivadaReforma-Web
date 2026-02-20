import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { getRoleLandingPath } from '../../shared/domain/auth'

type NavItem = {
  to: string
  label: string
  kind?: 'packages'
}

const residentNav: NavItem[] = [
  { to: '/app/home', label: 'Inicio' },
  { to: '/app/visits', label: 'Visitas' },
  { to: '/app/packages', label: 'Paquetes', kind: 'packages' },
  { to: '/app/incidents', label: 'Incidencias' },
  { to: '/app/profile', label: 'Perfil' },
]

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Panel' },
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/packages', label: 'Paquetes', kind: 'packages' },
  { to: '/admin/debts', label: 'Adeudos' },
  { to: '/admin/finance', label: 'Finanzas' },
  { to: '/admin/exports', label: 'Reportes' },
]

function resolveTitle(pathname: string): string {
  if (pathname.startsWith('/admin')) {
    return 'Operacion administrativa'
  }

  return 'Residencia'
}

function AuthLoadingShell() {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)] px-4 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-sm text-[var(--color-text-muted)]">Validando sesion...</p>
      </div>
    </div>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { authLoading, getHeldPackageCountForUser, logout, session } = useDemoData()

  if (authLoading) {
    return <AuthLoadingShell />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const expectedIsAdminArea = pathname.startsWith('/admin')
  const canUseAdminArea = ['admin', 'board'].includes(session.role)
  const canUseAppArea = ['resident', 'tenant', 'board', 'admin'].includes(session.role)
  if (expectedIsAdminArea && !canUseAdminArea) {
    return <Navigate to={getRoleLandingPath(session.role)} replace />
  }
  if (!expectedIsAdminArea && !canUseAppArea) {
    return <Navigate to={getRoleLandingPath(session.role)} replace />
  }

  const isAdmin = pathname.startsWith('/admin')
  const navItems = isAdmin ? adminNav : residentNav
  const heldPackages = getHeldPackageCountForUser()
  const shouldShowTopPackages = ['resident', 'tenant', 'board'].includes(session?.role ?? '')

  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-black/95 px-4 pb-3 pt-3 shadow-lg backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-400">
              Privada Reforma
            </p>
            <h1 className="text-base font-semibold text-white">{resolveTitle(pathname)}</h1>
            {shouldShowTopPackages ? (
              <p className="mt-1 text-xs font-semibold text-zinc-400">
                Paquetes: {heldPackages}
              </p>
            ) : null}
          </div>
          <button
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100"
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            type="button"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-950/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <ul
          className="mx-auto grid w-full max-w-md gap-1"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl border px-2 py-2 text-center text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-zinc-400 text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'border-transparent text-slate-400'
                  }`
                }
              >
                <span className="inline-flex items-center justify-center gap-1">
                  <span>{item.label}</span>
                  {item.kind === 'packages' && heldPackages > 0 ? (
                    <span className="rounded-full border border-amber-300/60 bg-gradient-to-b from-amber-300 to-orange-400 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-zinc-950 shadow-[0_0_10px_rgba(251,191,36,0.65)]">
                      {heldPackages}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
