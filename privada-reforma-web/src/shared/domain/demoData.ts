import { z } from 'zod'
import { userRoleSchema } from './auth'

export const localAccountSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  unit: z.string(),
})

export type LocalAccount = z.infer<typeof localAccountSchema>

export const qrPassSchema = z.object({
  id: z.string(),
  label: z.string(),
  qrValue: z.string(),
  type: z.enum(['temporary', 'trusted']),
  status: z.enum(['active', 'used', 'expired']),
  validUntil: z.string().optional(),
  note: z.string().optional(),
})

export type QrPass = z.infer<typeof qrPassSchema>

export const incidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  zone: z.string(),
  createdAt: z.string(),
  status: z.enum(['open', 'in_progress', 'resolved']),
  supports: z.number().int().nonnegative(),
  opposes: z.number().int().nonnegative(),
  guardComments: z.array(z.string()),
})

export type Incident = z.infer<typeof incidentSchema>

export const LOCAL_ACCOUNTS: LocalAccount[] = [
  {
    id: 'acc-resident-1',
    fullName: 'Ana Lopez',
    email: 'ana.lopez@privadareforma.mx',
    role: 'resident',
    unit: 'Casa 17',
  },
  {
    id: 'acc-guard-1',
    fullName: 'Carlos Mena',
    email: 'carlos.mena@privadareforma.mx',
    role: 'guard',
    unit: 'Caseta Norte',
  },
  {
    id: 'acc-board-1',
    fullName: 'Laura Ortega',
    email: 'laura.ortega@privadareforma.mx',
    role: 'board',
    unit: 'Casa 4',
  },
]

export const LOCAL_QR_PASSES: QrPass[] = [
  {
    id: 'qr-temp-1',
    label: 'Visita temporal: plomero',
    qrValue: 'PRIV-QR-TEMP-2026-02-13-PL01',
    type: 'temporary',
    status: 'active',
    validUntil: '2026-02-13 19:00',
    note: 'Solo hoy. Acceso unica entrada.',
  },
  {
    id: 'qr-trusted-1',
    label: 'Persona de confianza: Maria (nana)',
    qrValue: 'PRIV-QR-TRUST-MARIA-9981',
    type: 'trusted',
    status: 'active',
    note: 'Acceso recurrente lun-vie 07:00-19:00.',
  },
]

export const LOCAL_INCIDENTS: Incident[] = [
  {
    id: 'inc-1',
    title: 'Luz fundida en acceso peatonal',
    description:
      'Zona oscura en la noche frente a la pluma peatonal. Riesgo para vecinos.',
    zone: 'Acceso peatonal',
    createdAt: '2026-02-12 21:10',
    status: 'open',
    supports: 6,
    opposes: 0,
    guardComments: ['Guardia nocturno reporta visibilidad limitada.'],
  },
  {
    id: 'inc-2',
    title: 'Ruido excesivo en alberca',
    description:
      'Musica alta despues del horario permitido. Se solicita intervencion.',
    zone: 'Area alberca',
    createdAt: '2026-02-13 00:20',
    status: 'in_progress',
    supports: 3,
    opposes: 1,
    guardComments: ['Se dio primer aviso a visitantes.'],
  },
  {
    id: 'inc-3',
    title: 'Basura acumulada en area de mascotas',
    description: 'Contenedores llenos desde ayer por la tarde.',
    zone: 'Parque de mascotas',
    createdAt: '2026-02-13 07:45',
    status: 'open',
    supports: 2,
    opposes: 0,
    guardComments: [],
  },
]
