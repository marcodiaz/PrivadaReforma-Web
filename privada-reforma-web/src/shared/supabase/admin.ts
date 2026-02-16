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

  const sessionResult = await supabase.auth.getSession()
  const accessToken = sessionResult.data.session?.access_token
  if (!accessToken) {
    return { ok: false, error: 'Sesion no valida. Cierra sesion y vuelve a entrar.' }
  }

  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: input,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (error) {
    const errorWithContext = error as {
      message?: string
      context?: {
        json?: () => Promise<unknown>
        text?: () => Promise<string>
      }
    }
    let detailedError = errorWithContext.message ?? 'Error al invocar funcion.'

    if (errorWithContext.context?.json) {
      try {
        const payload = (await errorWithContext.context.json()) as {
          error?: string
          message?: string
        }
        detailedError = payload.error ?? payload.message ?? detailedError
      } catch {
        if (errorWithContext.context?.text) {
          try {
            const raw = await errorWithContext.context.text()
            if (raw.trim()) detailedError = raw
          } catch {
            // Keep original error message if response body cannot be read.
          }
        }
      }
    }

    return { ok: false, error: detailedError }
  }

  return (data as AdminCreateUserResult) ?? { ok: false, error: 'Respuesta invalida.' }
}
