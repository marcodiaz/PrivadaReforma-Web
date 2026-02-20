import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { OpsLayout } from './layouts/OpsLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { LoginPage } from '../features/auth/pages/LoginPage'
import {
  AppAnnouncementsPage,
  AppFinancePage,
  AppHomePage,
  AppIncidentsPage,
  AppParkingPage,
  AppPetsPage,
  AppPollsPage,
  AppPackagesPage,
  AppPoolPage,
  AppProfilePage,
  AppVisitsPage,
} from '../features/app/pages'
import {
  GuardIncidentsPage,
  GuardLogbookPage,
  GuardOfflinePage,
  GuardParkingPage,
  GuardPackagesPage,
  GuardScanPage,
} from '../features/guard/pages'
import {
  AdminAnnouncementsPage,
  AdminDashboardPage,
  AdminDebtsPage,
  AdminExportsPage,
  AdminFinancePage,
  AdminIncidentsPage,
  AdminMaintenancePage,
  AdminPackagesPage,
  AdminUsersPage,
  AdminVisitsPage,
} from '../features/admin/pages'
import { NotFoundPage } from '../features/public/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <PublicLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <AppHomePage /> },
      { path: 'visits', element: <AppVisitsPage /> },
      { path: 'packages', element: <AppPackagesPage /> },
      { path: 'pool', element: <Navigate to="/app/reservations" replace /> },
      { path: 'reservations', element: <AppPoolPage /> },
      { path: 'parking', element: <AppParkingPage /> },
      { path: 'pets', element: <AppPetsPage /> },
      { path: 'polls', element: <AppPollsPage /> },
      { path: 'incidents', element: <AppIncidentsPage /> },
      { path: 'announcements', element: <AppAnnouncementsPage /> },
      { path: 'finance', element: <AppFinancePage /> },
      { path: 'profile', element: <AppProfilePage /> },
    ],
  },
  {
    path: '/guard',
    element: <OpsLayout />,
    children: [
      { index: true, element: <Navigate to="scan" replace /> },
      { path: 'scan', element: <GuardScanPage /> },
      { path: 'packages', element: <GuardPackagesPage /> },
      { path: 'logbook', element: <GuardLogbookPage /> },
      { path: 'incidents', element: <GuardIncidentsPage /> },
      { path: 'parking', element: <GuardParkingPage /> },
      { path: 'offline', element: <GuardOfflinePage /> },
    ],
  },
  {
    path: '/admin',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'debts', element: <AdminDebtsPage /> },
      { path: 'visits', element: <AdminVisitsPage /> },
      { path: 'packages', element: <AdminPackagesPage /> },
      { path: 'incidents', element: <AdminIncidentsPage /> },
      { path: 'maintenance', element: <AdminMaintenancePage /> },
      { path: 'announcements', element: <AdminAnnouncementsPage /> },
      { path: 'finance', element: <AdminFinancePage /> },
      { path: 'exports', element: <AdminExportsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
