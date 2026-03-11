import { describe, expect, it } from 'vitest'
import { buildAdminDashboardSnapshot, buildGuardInboxSnapshot, buildUnitTaskCenter } from './dashboard'
import { moduleStatuses } from '../domain/moduleStatus'
import type { Incident, OfflineQueueEvent, ParkingReport, QrPass, Reservation, UnitAccountEntry } from '../domain/demoData'
import type { Package } from '../domain/packages'

const now = new Date().toISOString()
const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString()

describe('dashboard helpers', () => {
  it('builds admin inbox and kpis from live operational state', () => {
    const incidents: Incident[] = [
      {
        id: 'inc-1',
        title: 'Ruido',
        description: 'Fiesta',
        category: 'noise',
        priority: 'high',
        createdAt: twentyMinutesAgo,
        createdByUserId: 'u-1',
        status: 'open',
        supportScore: 3,
        votes: [],
        guardActions: [],
      },
    ]
    const parkingReports: ParkingReport[] = [
      {
        id: 'park-1',
        unitNumber: '1141',
        parkingSpot: 'E-1141',
        reportType: 'own_spot',
        description: 'Bloqueado',
        photoUrl: 'data:image/png;base64,abc',
        status: 'open',
        createdAt: now,
        createdByUserId: 'u-2',
      },
    ]
    const qrPasses: QrPass[] = [
      {
        id: 'qr-1',
        label: 'Visita',
        unitId: '1141',
        createdByUserId: 'u-3',
        visitorName: 'Ana',
        type: 'single_use',
        startAt: now,
        endAt: now,
        status: 'active',
        qrValue: 'QR-1',
        displayCode: '1141-0001',
      },
    ]
    const packages: Package[] = [
      {
        id: 'pkg-1',
        unitNumber: '1141',
        photoUrl: 'data:image/png;base64,abc',
        status: 'stored',
        createdAt: now,
        storedByGuardUserId: 'g-1',
      },
    ]
    const unitAccountEntries: UnitAccountEntry[] = [
      {
        id: 'ledger-1',
        unitNumber: '1141',
        entryType: 'charge',
        category: 'Mantenimiento',
        amountMxn: 1000,
        direction: 'debit',
        occurredAt: now,
        status: 'overdue',
        createdByUserId: 'a-1',
      },
    ]

    const snapshot = buildAdminDashboardSnapshot({
      qrPasses,
      packages,
      incidents,
      parkingReports,
      unitAccountEntries,
      moduleStatuses,
      operationalEvents: [{ id: 'evt-1', at: now, type: 'sync_failed' }],
    })

    expect(snapshot.activeVisitsToday).toBe(1)
    expect(snapshot.heldPackages).toBe(1)
    expect(snapshot.overdueIncidents).toBe(1)
    expect(snapshot.overdueUnitAccounts).toBe(1)
    expect(snapshot.inbox.some((item) => item.id === 'sync-failures')).toBe(true)
  })

  it('builds guard inbox with backlog and deliveries', () => {
    const qrPasses: QrPass[] = [
      {
        id: 'qr-delivery',
        label: 'Entrega',
        unitId: '1141',
        createdByUserId: 'u-1',
        visitorName: 'REPARTIDOR',
        deliveryProvider: 'DHL',
        type: 'delivery_open',
        startAt: now,
        endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'active',
        qrValue: 'QR-DEL',
        displayCode: '1141-0002',
      },
    ]
    const incidents: Incident[] = [
      {
        id: 'inc-2',
        title: 'Porton',
        description: 'No abre',
        category: 'other',
        priority: 'medium',
        createdAt: twentyMinutesAgo,
        createdByUserId: 'u-1',
        status: 'acknowledged',
        supportScore: 0,
        votes: [],
        guardActions: [],
      },
    ]
    const parkingReports: ParkingReport[] = []
    const offlineQueue: OfflineQueueEvent[] = [
      {
        id: 'offline-1',
        at: now,
        type: 'manual_qr_validation',
        payload: { departmentCode: '1141', sequenceCode: '0002', result: 'allow' },
        guardUserId: 'guard-1',
        synced: false,
      },
    ]
    const snapshot = buildGuardInboxSnapshot({
      qrPasses,
      incidents,
      parkingReports,
      offlineQueue,
      operationalEvents: [],
    })

    expect(snapshot.activeDeliveries).toBe(1)
    expect(snapshot.overdueIncidents).toBe(1)
    expect(snapshot.offlineBacklog).toBe(1)
  })

  it('summarizes task center by unit', () => {
    const reservations: Reservation[] = [
      {
        id: 'res-1',
        unitNumber: '1141',
        amenity: 'Terraza',
        reservationDate: '2026-03-12',
        fee: 5000,
        status: 'active',
        paymentRequired: true,
        paymentStatus: 'paid',
        createdAt: now,
        createdByUserId: 'u-1',
      },
    ]
    const unitTaskCenter = buildUnitTaskCenter({
      session: {
        userId: 'u-1',
        email: 'resident@example.com',
        fullName: 'Resident',
        role: 'resident',
        unitNumber: '1141',
      },
      qrPasses: [],
      packages: [],
      reservations,
      unitAccountEntries: [],
      parkingReports: [],
      incidents: [],
      financialMovements: [],
    })

    expect(unitTaskCenter.activeReservations).toBe(1)
  })
})
