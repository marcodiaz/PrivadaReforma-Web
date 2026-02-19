import { z } from 'zod'
import { userRoleSchema } from './auth'

export const localAccountSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  unitId: z.string(),
})

export type LocalAccount = z.infer<typeof localAccountSchema>

export const incidentPrioritySchema = z.enum(['low', 'medium', 'high'])
export const incidentCategorySchema = z.enum(['noise', 'pets', 'rules', 'other'])
export const incidentStatusSchema = z.enum([
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
])

export const incidentVoteSchema = z.object({
  userId: z.string(),
  value: z.union([z.literal(1), z.literal(-1)]),
  votedAt: z.string(),
})

export const guardActionSchema = z.object({
  at: z.string(),
  note: z.string().optional(),
  photoUrl: z.string().optional(),
})

export const incidentSchema = z.object({
  id: z.string(),
  unitNumber: z.string().optional(),
  title: z.string(),
  description: z.string(),
  category: incidentCategorySchema,
  priority: incidentPrioritySchema,
  createdAt: z.string(),
  createdByUserId: z.string(),
  status: incidentStatusSchema,
  acknowledgedAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  supportScore: z.number(),
  votes: z.array(incidentVoteSchema),
  guardActions: z.array(guardActionSchema),
})

export type Incident = z.infer<typeof incidentSchema>

export const qrPassTypeSchema = z.enum(['single_use', 'time_window'])
export const qrPassStatusSchema = z.enum(['active', 'used', 'expired', 'revoked'])

export const qrPassSchema = z.object({
  id: z.string(),
  label: z.string(),
  unitId: z.string(),
  createdByUserId: z.string(),
  visitorName: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
  maxPersons: z.number().int().positive().optional(),
  accessMessage: z.string().optional(),
  type: qrPassTypeSchema,
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  visitorPhotoUrl: z.string().optional(),
  status: qrPassStatusSchema,
  qrValue: z.string(),
  displayCode: z.string(),
})

export type QrPass = z.infer<typeof qrPassSchema>

export const auditLogSchema = z.object({
  id: z.string(),
  at: z.string(),
  actorUserId: z.string(),
  action: z.string(),
  targetId: z.string(),
  result: z.string(),
  note: z.string().optional(),
})

export type AuditLogEntry = z.infer<typeof auditLogSchema>

export const offlineQueueSchema = z.object({
  id: z.string(),
  at: z.string(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  guardUserId: z.string(),
  synced: z.boolean(),
})

export type OfflineQueueEvent = z.infer<typeof offlineQueueSchema>

export const appSessionSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: userRoleSchema,
  unitNumber: z.string().optional(),
})

export type AppSession = z.infer<typeof appSessionSchema>

export const LOCAL_ACCOUNTS: LocalAccount[] = [
  {
    id: 'acc-resident-1',
    fullName: 'Ana Lopez',
    email: 'ana.lopez@privadareforma.mx',
    role: 'resident',
    unitId: '1141',
  },
  {
    id: 'acc-tenant-1',
    fullName: 'Juan Perez',
    email: 'juan.perez@privadareforma.mx',
    role: 'tenant',
    unitId: '1141',
  },
  {
    id: 'acc-guard-1',
    fullName: 'Carlos Mena',
    email: 'carlos.mena@privadareforma.mx',
    role: 'guard',
    unitId: 'Caseta Norte',
  },
  {
    id: 'acc-board-1',
    fullName: 'Marco Ortega',
    email: 'marco.ortega@privadareforma.mx',
    role: 'board',
    unitId: '1142',
  },
]

export const LOCAL_QR_PASSES: QrPass[] = [
  {
    id: 'qr-single-1',
    label: 'Visita temporal: plomero',
    unitId: '1141',
    createdByUserId: 'acc-resident-1',
    visitorName: 'PLOMERO',
    maxUses: 1,
    maxPersons: 1,
    type: 'single_use',
    endAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    qrValue: 'PRIV-QR-1141-0001',
    displayCode: '1141-0001',
  },
  {
    id: 'qr-window-1',
    label: 'Persona de confianza: Maria (nana)',
    unitId: '1141',
    createdByUserId: 'acc-resident-1',
    visitorName: 'MARIA',
    maxUses: 30,
    maxPersons: 1,
    type: 'time_window',
    startAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    visitorPhotoUrl: 'https://example.com/maria-nana.jpg',
    status: 'active',
    qrValue: 'PRIV-QR-1141-0002',
    displayCode: '1141-0002',
  },
]

export const LOCAL_INCIDENTS: Incident[] = [
  {
    id: 'inc-1',
    title: 'Luz fundida en acceso peatonal',
    description: 'Zona oscura frente a pluma peatonal.',
    category: 'rules',
    priority: 'high',
    createdAt: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    createdByUserId: 'acc-resident-1',
    status: 'open',
    supportScore: 1,
    votes: [{ userId: 'acc-resident-1', value: 1, votedAt: new Date().toISOString() }],
    guardActions: [],
  },
  {
    id: 'inc-2',
    title: 'Ruido excesivo en alberca',
    description: 'Musica alta despues del horario permitido.',
    category: 'noise',
    priority: 'medium',
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    createdByUserId: 'acc-tenant-1',
    status: 'open',
    supportScore: 0,
    votes: [],
    guardActions: [],
  },
  {
    id: 'inc-3',
    title: 'Jovenes sin adultos en la alberca en la noche',
    description:
      'Se detecta grupo de menores sin supervision adulta despues del horario permitido.',
    category: 'rules',
    priority: 'high',
    createdAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    createdByUserId: 'acc-resident-1',
    status: 'open',
    supportScore: 5,
    votes: [
      { userId: 'u-1', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-2', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-3', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-4', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-5', value: 1, votedAt: new Date().toISOString() },
    ],
    guardActions: [],
  },
  {
    id: 'inc-4',
    title: 'Fiesta con ruido extremo y vidrios en area comun',
    description:
      'Vecinos reportan riesgo inmediato por botellas rotas y musica alta pasada medianoche.',
    category: 'noise',
    priority: 'high',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    createdByUserId: 'acc-tenant-1',
    status: 'open',
    supportScore: 10,
    votes: [
      { userId: 'u-11', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-12', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-13', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-14', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-15', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-16', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-17', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-18', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-19', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-20', value: 1, votedAt: new Date().toISOString() },
    ],
    guardActions: [],
  },
]

export const LOCAL_AUDIT_LOG: AuditLogEntry[] = []
export const LOCAL_OFFLINE_QUEUE: OfflineQueueEvent[] = []
