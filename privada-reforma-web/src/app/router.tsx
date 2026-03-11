import { Suspense, lazy, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { OpsLayout } from './layouts/OpsLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { NotFoundPage } from '../features/public/pages/NotFoundPage'

function RouteFallback() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
      Cargando modulo...
    </div>
  )
}

function lazyNamed<TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  factory: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(async () => ({
    default: (await factory())[key] as ComponentType,
  }))
}

function withSuspense(Component: ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  )
}

const LoginPage = lazyNamed(() => import('../features/auth/pages/LoginPage'), 'LoginPage')
const AppHomePage = lazyNamed(() => import('../features/app/pages'), 'AppHomePage')
const AppAddTenantPage = lazyNamed(() => import('../features/app/pages'), 'AppAddTenantPage')
const AppVisitsPage = lazyNamed(() => import('../features/app/pages'), 'AppVisitsPage')
const AppPackagesPage = lazyNamed(() => import('../features/app/pages'), 'AppPackagesPage')
const AppPoolPage = lazyNamed(() => import('../features/app/pages'), 'AppPoolPage')
const AppParkingPage = lazyNamed(() => import('../features/app/pages'), 'AppParkingPage')
const AppPetsPage = lazyNamed(() => import('../features/app/pages'), 'AppPetsPage')
const AppMaintenancePage = lazyNamed(() => import('../features/app/pages'), 'AppMaintenancePage')
const AppDirectoryPage = lazyNamed(() => import('../features/app/pages'), 'AppDirectoryPage')
const AppMarketplacePage = lazyNamed(() => import('../features/app/pages'), 'AppMarketplacePage')
const AppPollsPage = lazyNamed(() => import('../features/app/pages'), 'AppPollsPage')
const AppIncidentsPage = lazyNamed(() => import('../features/app/pages'), 'AppIncidentsPage')
const AppAnnouncementsPage = lazyNamed(() => import('../features/app/pages'), 'AppAnnouncementsPage')
const AppFinancePage = lazyNamed(() => import('../features/app/pages'), 'AppFinancePage')
const AppProfilePage = lazyNamed(() => import('../features/app/pages'), 'AppProfilePage')

const GuardScanPage = lazyNamed(() => import('../features/guard/pages'), 'GuardScanPage')
const GuardPackagesPage = lazyNamed(() => import('../features/guard/pages'), 'GuardPackagesPage')
const GuardLogbookPage = lazyNamed(() => import('../features/guard/pages'), 'GuardLogbookPage')
const GuardIncidentsPage = lazyNamed(() => import('../features/guard/pages'), 'GuardIncidentsPage')
const GuardParkingPage = lazyNamed(() => import('../features/guard/pages'), 'GuardParkingPage')
const GuardOfflinePage = lazyNamed(() => import('../features/guard/pages'), 'GuardOfflinePage')

const AdminDashboardPage = lazyNamed(() => import('../features/admin/pages'), 'AdminDashboardPage')
const AdminUsersPage = lazyNamed(() => import('../features/admin/pages'), 'AdminUsersPage')
const AdminPushPage = lazyNamed(() => import('../features/admin/pages'), 'AdminPushPage')
const AdminReportsPage = lazyNamed(() => import('../features/admin/pages'), 'AdminReportsPage')
const AdminDebtsPage = lazyNamed(() => import('../features/admin/pages'), 'AdminDebtsPage')
const AdminVisitsPage = lazyNamed(() => import('../features/admin/pages'), 'AdminVisitsPage')
const AdminPackagesPage = lazyNamed(() => import('../features/admin/pages'), 'AdminPackagesPage')
const AdminIncidentsPage = lazyNamed(() => import('../features/admin/pages'), 'AdminIncidentsPage')
const AdminMaintenancePage = lazyNamed(() => import('../features/admin/pages'), 'AdminMaintenancePage')
const AdminAnnouncementsPage = lazyNamed(
  () => import('../features/admin/pages'),
  'AdminAnnouncementsPage',
)
const AdminFinancePage = lazyNamed(() => import('../features/admin/pages'), 'AdminFinancePage')
const AdminExportsPage = lazyNamed(() => import('../features/admin/pages'), 'AdminExportsPage')

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <PublicLayout />,
    children: [{ path: '/login', element: withSuspense(LoginPage) }],
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: withSuspense(AppHomePage) },
      { path: 'add-tenant', element: withSuspense(AppAddTenantPage) },
      { path: 'visits', element: withSuspense(AppVisitsPage) },
      { path: 'packages', element: withSuspense(AppPackagesPage) },
      { path: 'pool', element: <Navigate to="/app/reservations" replace /> },
      { path: 'reservations', element: withSuspense(AppPoolPage) },
      { path: 'parking', element: withSuspense(AppParkingPage) },
      { path: 'pets', element: withSuspense(AppPetsPage) },
      { path: 'maintenance', element: withSuspense(AppMaintenancePage) },
      { path: 'directory', element: withSuspense(AppDirectoryPage) },
      { path: 'marketplace', element: withSuspense(AppMarketplacePage) },
      { path: 'polls', element: withSuspense(AppPollsPage) },
      { path: 'incidents', element: withSuspense(AppIncidentsPage) },
      { path: 'announcements', element: withSuspense(AppAnnouncementsPage) },
      { path: 'finance', element: withSuspense(AppFinancePage) },
      { path: 'profile', element: withSuspense(AppProfilePage) },
    ],
  },
  {
    path: '/guard',
    element: <OpsLayout />,
    children: [
      { index: true, element: <Navigate to="scan" replace /> },
      { path: 'scan', element: withSuspense(GuardScanPage) },
      { path: 'packages', element: withSuspense(GuardPackagesPage) },
      { path: 'logbook', element: withSuspense(GuardLogbookPage) },
      { path: 'incidents', element: withSuspense(GuardIncidentsPage) },
      { path: 'parking', element: withSuspense(GuardParkingPage) },
      { path: 'offline', element: withSuspense(GuardOfflinePage) },
    ],
  },
  {
    path: '/admin',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: withSuspense(AdminDashboardPage) },
      { path: 'users', element: withSuspense(AdminUsersPage) },
      { path: 'push', element: withSuspense(AdminPushPage) },
      { path: 'reports', element: withSuspense(AdminReportsPage) },
      { path: 'debts', element: withSuspense(AdminDebtsPage) },
      { path: 'visits', element: withSuspense(AdminVisitsPage) },
      { path: 'packages', element: withSuspense(AdminPackagesPage) },
      { path: 'incidents', element: withSuspense(AdminIncidentsPage) },
      { path: 'maintenance', element: withSuspense(AdminMaintenancePage) },
      { path: 'announcements', element: withSuspense(AdminAnnouncementsPage) },
      { path: 'finance', element: withSuspense(AdminFinancePage) },
      { path: 'exports', element: withSuspense(AdminExportsPage) },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
