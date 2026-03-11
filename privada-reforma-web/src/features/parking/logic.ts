import type { ParkingReport } from '../../shared/domain/demoData'

export function createParkingReportRecord(input: {
  id: string
  unitNumber: string
  createdByUserId: string
  description: string
  reportType: ParkingReport['reportType']
  visitorParkingSpot?: string
  photoUrl: string
  parkingSpot: string
  createdAt?: string
}) {
  const description = input.description.trim()
  const photoUrl = input.photoUrl.trim()
  const visitorParkingSpot = input.visitorParkingSpot?.trim()

  if (!description) {
    return { ok: false, error: 'Agrega una descripcion del reporte.' } as const
  }
  if (!photoUrl) {
    return { ok: false, error: 'Foto obligatoria para enviar el reporte.' } as const
  }
  if (input.reportType === 'visitor_spot' && !visitorParkingSpot) {
    return { ok: false, error: 'Indica el cajon de visitante reportado.' } as const
  }

  return {
    ok: true,
    report: {
      id: input.id,
      unitNumber: input.unitNumber,
      parkingSpot: input.parkingSpot,
      reportType: input.reportType,
      visitorParkingSpot: input.reportType === 'visitor_spot' ? visitorParkingSpot : undefined,
      description,
      photoUrl,
      status: 'open',
      createdAt: input.createdAt ?? new Date().toISOString(),
      createdByUserId: input.createdByUserId,
    } satisfies ParkingReport,
  } as const
}

export function updateParkingReportRecord(
  report: ParkingReport,
  input: {
    status: 'owner_notified' | 'tow_truck_notified'
    handledByGuardUserId: string
    guardNote?: string
    updatedAt?: string
  },
) {
  return {
    ...report,
    status: input.status,
    guardNote: input.guardNote?.trim() || report.guardNote,
    handledByGuardUserId: input.handledByGuardUserId,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  } satisfies ParkingReport
}
