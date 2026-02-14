import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDemoData } from '../../shared/state/DemoDataContext'

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
  { to: '/app/pool', label: 'Alberca' },
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

  return 'App residencial'
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { getHeldPackageCountForUser, logout, session } = useDemoData()
  const isAdmin = pathname.startsWith('/admin')
  const navItems = isAdmin ? adminNav : residentNav
  const heldPackages = getHeldPackageCountForUser()
  const shouldShowTopPackages = ['resident', 'tenant', 'board'].includes(session?.role ?? '')

  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Privada Reforma
            </p>
            <h1 className="text-base font-semibold text-[var(--color-text)]">
              {resolveTitle(pathname)}
            </h1>
            {shouldShowTopPackages ? (
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                Packages: {heldPackages}
              </p>
            ) : null}
          </div>
          <button
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)]"
            onClick={() => {
              logout()
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

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <ul
          className="mx-auto grid w-full max-w-md gap-1"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-2 py-2 text-center text-xs font-medium ${
                    isActive
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'text-[var(--color-text-muted)]'
                  }`
                }
              >
                <span className="inline-flex items-center justify-center gap-1">
                  <span>{item.label}</span>
                  {item.kind === 'packages' && heldPackages > 0 ? (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none">
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
