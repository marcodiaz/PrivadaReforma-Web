import { z } from 'zod'

export const packageStatusSchema = z.enum(['stored', 'ready_for_pickup', 'delivered'])

export const packageSchema = z.object({
  id: z.string(),
  unitNumber: z.string(),
  photoUrl: z.string(),
  carrier: z.string().optional(),
  notes: z.string().optional(),
  status: packageStatusSchema,
  createdAt: z.string(),
  storedByGuardUserId: z.string(),
  readyAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  deliveredByGuardUserId: z.string().optional(),
  readyByUserId: z.string().optional(),
})

export type Package = z.infer<typeof packageSchema>

export const LOCAL_PACKAGES: Package[] = [
  {
    id: 'pkg-1',
    unitNumber: '1141',
    photoUrl:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2U1ZTdmYiIvPjx0ZXh0IHg9IjMwMCIgeT0iMjAwIiBmb250LXNpemU9IjM2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWEyMzMxIj5QYXF1ZXRlIDE8L3RleHQ+PC9zdmc+',
    carrier: 'DHL',
    notes: 'Recepcion en caseta',
    status: 'stored',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    storedByGuardUserId: 'acc-guard-1',
  },
  {
    id: 'pkg-2',
    unitNumber: '1142',
    photoUrl:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Q5ZjllZiIvPjx0ZXh0IHg9IjMwMCIgeT0iMjAwIiBmb250LXNpemU9IjM2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMWEyMzMxIj5QYXF1ZXRlIDI8L3RleHQ+PC9zdmc+',
    carrier: 'FedEx',
    status: 'ready_for_pickup',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    storedByGuardUserId: 'acc-guard-1',
    readyAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    readyByUserId: 'acc-board-1',
  },
]
