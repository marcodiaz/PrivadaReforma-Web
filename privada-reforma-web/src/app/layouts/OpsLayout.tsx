import { useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { getRoleLandingPath } from '../../shared/domain/auth'
import { canAccessGuardArea } from '../../shared/domain/capabilities'
import {
  getLifecycleBadgeClass,
  getLifecycleLabel,
  getModuleStatusForPath,
} from '../../shared/domain/moduleStatus'

const opsNav = [
  { to: '/guard/scan', label: 'Escanear', moduleId: 'guard' },
  { to: '/guard/packages', label: 'Paquetes', moduleId: 'packages' },
  { to: '/guard/parking', label: 'Parking', moduleId: 'parking' },
  { to: '/guard/logbook', label: 'Bitacora', moduleId: 'guard' },
  { to: '/guard/incidents', label: 'Incidencia', moduleId: 'incidents' },
  { to: '/guard/offline', label: 'Offline', moduleId: 'guard' },
]

function AuthLoadingShell() {
  return (
    <div className="min-h-dvh bg-zinc-950 px-4 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-300">Validando sesion...</p>
      </div>
    </div>
  )
}

export function OpsLayout() {
  const { authLoading, getHeldPackageCountGlobal, isOnline, logout, parkingReports, session } =
    useDemoData()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  if (authLoading) {
    return <AuthLoadingShell />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessGuardArea(session.role)) {
    return <Navigate to={getRoleLandingPath(session.role)} replace />
  }

  const heldPackages = getHeldPackageCountGlobal()
  const pendingParkingReports = parkingReports.filter((report) => report.status === 'open').length
  const activeModule = getModuleStatusForPath(pathname)

  return (
    <div className="app-shell-gradient min-h-dvh bg-[var(--color-bg)] text-white flex flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-[rgba(8,12,19,0.72)] px-4 pb-3 pt-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-400">
              Operacion de guardia
            </p>
            <h1 className="text-base font-semibold">Control de acceso</h1>
            {activeModule ? (
              <p className="mt-1">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${getLifecycleBadgeClass(activeModule.lifecycle)}`}
                >
                  {getLifecycleLabel(activeModule.lifecycle)}
                </span>
              </p>
            ) : null}
            <p className="text-xs text-zinc-400">Paquetes en resguardo: {heldPackages}</p>
            <p className="text-xs text-zinc-400">
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
              className="rounded-full border border-zinc-700 bg-[linear-gradient(135deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.02))] px-3.5 py-1.5 text-xs font-semibold text-zinc-100 backdrop-blur"
              onClick={async () => {
                if (signingOut) {
                  return
                }
                setSigningOut(true)
                try {
                  await logout()
                } finally {
                  navigate('/login', { replace: true })
                  setSigningOut(false)
                }
              }}
              disabled={signingOut}
              type="button"
            >
              {signingOut ? 'Saliendo...' : 'Salir'}
            </button>
          </div>
        </div>
      </header>

      {!isOnline ? (
        <div className="border-b border-amber-500/40 bg-amber-400/20 px-4 py-2 text-center text-sm text-amber-100">
          Sin red: usa <NavLink to="/guard/offline">modo offline</NavLink>.
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-md flex-1 min-h-0 overflow-y-auto px-4 pb-5 pt-5">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-zinc-800 bg-[rgba(8,12,19,0.72)] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <ul className="mx-auto grid w-full max-w-md grid-cols-2 gap-2">
          {opsNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-2xl border px-3 py-3 text-center text-sm font-semibold ${
                    isActive
                      ? 'border-zinc-200 bg-zinc-100/10 text-zinc-100'
                      : 'border-zinc-700 text-zinc-300'
                  }`
                }
              >
                <span className="inline-flex items-center gap-1">
                  <span>{item.label}</span>
                  {item.to === '/guard/packages' && heldPackages > 0 ? (
                    <span className="rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-300 to-orange-400 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-zinc-950 shadow-[0_0_10px_rgba(251,191,36,0.65)]">
                      {heldPackages}
                    </span>
                  ) : null}
                  {item.to === '/guard/parking' && pendingParkingReports > 0 ? (
                    <span className="rounded-full border border-red-300/70 bg-gradient-to-b from-red-300 to-red-500 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-zinc-950 shadow-[0_0_10px_rgba(239,68,68,0.65)]">
                      {pendingParkingReports}
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
