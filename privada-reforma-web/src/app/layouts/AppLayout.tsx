import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDemoData } from '../../shared/state/DemoDataContext'
import { getRoleLandingPath } from '../../shared/domain/auth'
import { useLanguage } from '../../shared/i18n/LanguageContext'

type NavItem = {
  to: string
  labelEs: string
  labelEn: string
  kind?: 'packages' | 'reports'
}

type AdminSection = 'ops' | 'moderation' | 'finance'
const ADMIN_SECTION_STORAGE_KEY = 'admin_nav_section_v1'

const residentNav: NavItem[] = [
  { to: '/app/home', labelEs: 'Inicio', labelEn: 'Home' },
  { to: '/app/visits', labelEs: 'Visitas', labelEn: 'Visits' },
  { to: '/app/packages', labelEs: 'Paquetes', labelEn: 'Packages', kind: 'packages' },
  { to: '/app/incidents', labelEs: 'Incidencias', labelEn: 'Incidents' },
  { to: '/app/profile', labelEs: 'Perfil', labelEn: 'Profile' },
]

const adminSectionLabels: Record<AdminSection, { es: string; en: string }> = {
  ops: { es: 'Operacion', en: 'Ops' },
  moderation: { es: 'Moderacion', en: 'Moderation' },
  finance: { es: 'Finanzas', en: 'Finance' },
}

const adminNavBySection: Record<AdminSection, NavItem[]> = {
  ops: [
    { to: '/admin/dashboard', labelEs: 'Panel', labelEn: 'Dashboard' },
    { to: '/admin/users', labelEs: 'Usuarios', labelEn: 'Users' },
    { to: '/admin/push', labelEs: 'Push', labelEn: 'Push' },
  ],
  moderation: [
    { to: '/admin/reports', labelEs: 'Reportes', labelEn: 'Reports', kind: 'reports' },
    { to: '/admin/packages', labelEs: 'Paquetes', labelEn: 'Packages', kind: 'packages' },
  ],
  finance: [
    { to: '/admin/debts', labelEs: 'Adeudos', labelEn: 'Debts' },
    { to: '/admin/finance', labelEs: 'Finanzas', labelEn: 'Finance' },
    { to: '/admin/exports', labelEs: 'Reportes', labelEn: 'Exports' },
  ],
}

const adminSectionOrder: AdminSection[] = ['ops', 'moderation', 'finance']

function resolveAdminSection(pathname: string): AdminSection {
  if (pathname.startsWith('/admin/reports') || pathname.startsWith('/admin/packages')) {
    return 'moderation'
  }
  if (
    pathname.startsWith('/admin/debts') ||
    pathname.startsWith('/admin/finance') ||
    pathname.startsWith('/admin/exports')
  ) {
    return 'finance'
  }
  return 'ops'
}

function readStoredAdminSection(): AdminSection | null {
  try {
    const value = localStorage.getItem(ADMIN_SECTION_STORAGE_KEY)
    if (value === 'ops' || value === 'moderation' || value === 'finance') {
      return value
    }
  } catch {
    // no-op
  }
  return null
}

function writeStoredAdminSection(section: AdminSection) {
  try {
    localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, section)
  } catch {
    // no-op
  }
}

function resolveTitle(pathname: string, labels: { adminOperation: string; residence: string }): string {
  if (pathname.startsWith('/admin')) {
    return labels.adminOperation
  }

  return labels.residence
}

function AuthLoadingShell() {
  const { t } = useLanguage()
  return (
    <div className="min-h-dvh bg-[var(--color-bg)] px-4 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-sm text-[var(--color-text-muted)]">{t('validatingSession')}</p>
      </div>
    </div>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t, tx } = useLanguage()
  const { authLoading, getHeldPackageCountForUser, logout, moderationReports, session } = useDemoData()
  const [signingOut, setSigningOut] = useState(false)
  const isAdmin = pathname.startsWith('/admin')
  const activeAdminSection = resolveAdminSection(pathname)
  const navItems = isAdmin ? adminNavBySection[activeAdminSection] : residentNav
  const heldPackages = getHeldPackageCountForUser()
  const openReports = moderationReports.filter((report) => report.status === 'open').length
  const shouldShowTopPackages = ['resident', 'tenant', 'board'].includes(session?.role ?? '')
  const navItemWidth = isAdmin ? 'min-w-[112px]' : 'min-w-[92px]'

  useEffect(() => {
    if (!isAdmin) {
      return
    }
    writeStoredAdminSection(activeAdminSection)
  }, [activeAdminSection, isAdmin])

  useEffect(() => {
    if (!isAdmin || pathname !== '/admin/dashboard') {
      return
    }
    const storedSection = readStoredAdminSection()
    if (!storedSection || storedSection === 'ops') {
      return
    }
    navigate(adminNavBySection[storedSection][0].to, { replace: true })
  }, [isAdmin, navigate, pathname])

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

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 pb-3 pt-3 shadow-lg backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Privada Reforma
            </p>
            <h1 className="text-base font-semibold text-[var(--color-text)]">
              {resolveTitle(pathname, { adminOperation: t('adminOperation'), residence: t('residence') })}
            </h1>
            {shouldShowTopPackages ? (
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                {t('packagesCount')}: {heldPackages}
              </p>
            ) : null}
          </div>
          <button
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)]"
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
            {signingOut ? tx('Cerrando...', 'Signing out...') : t('logout')}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-4">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-2 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        {isAdmin ? (
          <ul className="mx-auto mb-2 grid w-full max-w-md grid-cols-3 gap-2">
            {adminSectionOrder.map((section) => (
              <li key={section}>
                <button
                  className={`block w-full rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition-colors ${
                    section === activeAdminSection
                      ? 'border-[var(--color-border)] text-[var(--color-text)] shadow-[inset_0_0_0_1px_rgba(127,127,127,0.12)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                  onClick={() => {
                    writeStoredAdminSection(section)
                    navigate(adminNavBySection[section][0].to)
                  }}
                  type="button"
                >
                  {tx(adminSectionLabels[section].es, adminSectionLabels[section].en)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="mx-auto flex w-full max-w-md gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <li className={`${navItemWidth} ${isAdmin ? 'flex-1' : 'shrink-0'}`} key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `relative block rounded-xl border px-2 py-2 text-center text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-[var(--color-border)] text-[var(--color-text)] shadow-[inset_0_0_0_1px_rgba(127,127,127,0.12)]'
                      : 'border-transparent text-[var(--color-text-muted)]'
                  }`
                }
              >
                <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                  <span>{tx(item.labelEs, item.labelEn)}</span>
                </span>
                {item.kind === 'packages' && heldPackages > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-zinc-900 bg-white px-1 text-[10px] font-black leading-none text-zinc-900 shadow-[0_0_14px_rgba(255,255,255,0.85)]">
                    {heldPackages}
                  </span>
                ) : null}
                {item.kind === 'reports' && openReports > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-zinc-900 bg-white px-1 text-[10px] font-black leading-none text-zinc-900 shadow-[0_0_14px_rgba(255,255,255,0.85)]">
                    ★
                  </span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
