import { describe, expect, it } from 'vitest'
import { createParkingReportRecord, updateParkingReportRecord } from './logic'
import type { ParkingReport } from '../../shared/domain/demoData'

describe('parking logic', () => {
  it('creates a valid parking report record', () => {
    const result = createParkingReportRecord({
      id: 'park-1',
      unitNumber: '1141',
      createdByUserId: 'resident-1',
      description: 'Vehiculo bloqueando acceso',
      reportType: 'own_spot',
      photoUrl: 'data:image/png;base64,abc',
      parkingSpot: 'E-1141',
      createdAt: '2026-03-10T18:00:00.000Z',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.report.status).toBe('open')
      expect(result.report.parkingSpot).toBe('E-1141')
    }
  })

  it('requires visitor spot when report type is visitor', () => {
    const result = createParkingReportRecord({
      id: 'park-2',
      unitNumber: '1141',
      createdByUserId: 'resident-1',
      description: 'Ocupa cajon visitante',
      reportType: 'visitor_spot',
      photoUrl: 'data:image/png;base64,abc',
      parkingSpot: 'Visitante',
    })

    expect(result.ok).toBe(false)
  })

  it('updates parking report status with guard attribution', () => {
    const report: ParkingReport = {
      id: 'park-1',
      unitNumber: '1141',
      parkingSpot: 'E-1141',
      reportType: 'own_spot',
      description: 'Vehiculo bloqueando acceso',
      photoUrl: 'data:image/png;base64,abc',
      status: 'open',
      createdAt: '2026-03-10T18:00:00.000Z',
      createdByUserId: 'resident-1',
    }

    const updated = updateParkingReportRecord(report, {
      status: 'owner_notified',
      handledByGuardUserId: 'guard-1',
      guardNote: 'Vehiculo movido',
      updatedAt: '2026-03-10T18:10:00.000Z',
    })

    expect(updated.status).toBe('owner_notified')
    expect(updated.handledByGuardUserId).toBe('guard-1')
    expect(updated.guardNote).toBe('Vehiculo movido')
  })
})
