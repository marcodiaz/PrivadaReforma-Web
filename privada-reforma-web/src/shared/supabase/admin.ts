import { supabase } from './client'

export type ManagedUserRole =
  | 'admin'
  | 'resident'
  | 'tenant'
  | 'guard'
  | 'board_member'
  | 'maintenance'

type AdminCreateUserInput = {
  mode: 'invite' | 'create'
  email: string
  role: ManagedUserRole
  unitNumber?: string
  password?: string
}

type AdminCreateUserResult = {
  ok: boolean
  userId?: string
  email?: string
  mode?: 'invite' | 'create'
  error?: string
}

export async function adminCreateOrInviteUser(
  input: AdminCreateUserInput,
): Promise<AdminCreateUserResult> {
  if (!supabase) {
    return { ok: false, error: 'Supabase no esta configurado.' }
  }

  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: input,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return (data as AdminCreateUserResult) ?? { ok: false, error: 'Respuesta invalida.' }
}
