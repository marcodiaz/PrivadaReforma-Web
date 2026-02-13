import { z } from 'zod'

export const userRoleSchema = z.enum([
  'resident',
  'tenant',
  'guard',
  'admin',
  'board',
])

export type UserRole = z.infer<typeof userRoleSchema>

export const loginDraftSchema = z.object({
  email: z.string().email('Correo invalido'),
  role: userRoleSchema,
})

export type LoginDraft = z.infer<typeof loginDraftSchema>

export function getRoleLandingPath(role: UserRole): string {
  switch (role) {
    case 'guard':
      return '/guard/scan'
    case 'admin':
    case 'board':
      return '/admin/dashboard'
    case 'resident':
    case 'tenant':
    default:
      return '/app/home'
  }
}
