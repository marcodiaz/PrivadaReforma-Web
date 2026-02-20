import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { getRoleLandingPath } from '../../shared/domain/auth'

const opsNav = [
  { to: '/guard/scan', label: 'Escanear' },
  { to: '/guard/packages', label: 'Paquetes' },
  { to: '/guard/parking', label: 'Parking' },
  { to: '/guard/logbook', label: 'Bitacora' },
  { to: '/guard/incidents', label: 'Incidencia' },
  { to: '/guard/offline', label: 'Offline' },
]

function AuthLoadingShell() {
  return (
    <div className="min-h-dvh bg-slate-950 px-4 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-300">Validando sesion...</p>
      </div>
    </div>
  )
}

export function OpsLayout() {
  const { authLoading, getHeldPackageCountGlobal, isOnline, logout, parkingReports, session } =
    useDemoData()
  const navigate = useNavigate()

  if (authLoading) {
    return <AuthLoadingShell />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (session.role !== 'guard') {
    return <Navigate to={getRoleLandingPath(session.role)} replace />
  }

  const heldPackages = getHeldPackageCountGlobal()
  const pendingParkingReports = parkingReports.filter((report) => report.status === 'open').length

  return (
    <div className="min-h-dvh bg-slate-950 text-white">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-400">
              Operacion de guardia
            </p>
            <h1 className="text-base font-semibold">Control de acceso</h1>
            <p className="text-xs text-slate-400">Paquetes en resguardo: {heldPackages}</p>
            <p className="text-xs text-slate-400">
              Reportes de parking pendientes: {pendingParkingReports}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isOnline ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'
              }`}
            >
              {isOnline ? 'En linea' : 'Offline'}
            </span>
            <button
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
              type="button"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {!isOnline ? (
        <div className="border-b border-amber-500/40 bg-amber-400/20 px-4 py-2 text-center text-sm text-amber-100">
          Sin red: usa <NavLink to="/guard/offline">modo offline</NavLink>.
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-md px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <ul className="mx-auto grid w-full max-w-md grid-cols-2 gap-2">
          {opsNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-2xl border px-3 py-3 text-center text-sm font-semibold ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 text-slate-200'
                  }`
                }
              >
                <span className="inline-flex items-center gap-1">
                  <span>{item.label}</span>
                  {item.to === '/guard/packages' && heldPackages > 0 ? (
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
