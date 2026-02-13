import { NavLink, Outlet, useLocation } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
}

const residentNav: NavItem[] = [
  { to: '/app/home', label: 'Inicio' },
  { to: '/app/visits', label: 'Visitas' },
  { to: '/app/pool', label: 'Alberca' },
  { to: '/app/incidents', label: 'Incidencias' },
  { to: '/app/profile', label: 'Perfil' },
]

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Panel' },
  { to: '/admin/users', label: 'Usuarios' },
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
  const isAdmin = pathname.startsWith('/admin')
  const navItems = isAdmin ? adminNav : residentNav

  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            Privada Reforma
          </p>
          <h1 className="text-base font-semibold text-[var(--color-text)]">
            {resolveTitle(pathname)}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <ul className="mx-auto grid w-full max-w-md grid-cols-5 gap-1">
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
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
