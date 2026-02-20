import { supabase } from './client'

export type ManagedUserRole =
  | 'admin'
  | 'resident'
  | 'tenant'
  | 'guard'
  | 'board_member'
  | 'maintenance'

export type ManagedProfile = {
  userId: string
  role: ManagedUserRole
  unitNumber: string | null
}

export type AdminPushTargetMode = 'user' | 'unit' | 'role' | 'all'

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

type AdminPushInput = {
  targetMode: AdminPushTargetMode
  userId?: string
  unitNumber?: string
  role?: ManagedUserRole
  includeCaller?: boolean
  title?: string
  body: string
  url?: string
  tag?: string
}

type AdminPushResult = {
  ok: boolean
  sent?: number
  removed?: number
  targetUsers?: number
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

export async function fetchManagedProfiles(): Promise<ManagedProfile[] | null> {
  if (!supabase) {
    return null
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, role, unit_number')
    .order('role', { ascending: true })
    .order('unit_number', { ascending: true, nullsFirst: false })

  if (error || !data) {
    return null
  }

  return data.map((row) => ({
    userId: row.user_id,
    role: row.role as ManagedUserRole,
    unitNumber: row.unit_number,
  }))
}

export async function adminSendTargetedPush(input: AdminPushInput): Promise<AdminPushResult> {
  if (!supabase) {
    return { ok: false, error: 'Supabase no esta configurado.' }
  }

  const sessionResult = await supabase.auth.getSession()
  const accessToken = sessionResult.data.session?.access_token
  if (!accessToken) {
    return { ok: false, error: 'Sesion no valida. Cierra sesion y vuelve a entrar.' }
  }

  const { data, error } = await supabase.functions.invoke('admin-send-push', {
    body: input,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const payload = (data as AdminPushResult | null) ?? { ok: false, error: 'Respuesta invalida.' }
  if (!payload.ok) {
    return { ok: false, error: payload.error ?? 'No fue posible enviar notificaciones.' }
  }
  return payload
}
