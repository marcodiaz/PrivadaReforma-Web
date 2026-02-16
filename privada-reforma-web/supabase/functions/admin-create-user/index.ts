import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ManagedUserRole =
  | 'admin'
  | 'resident'
  | 'tenant'
  | 'guard'
  | 'board_member'
  | 'maintenance'

type Payload = {
  mode: 'invite' | 'create'
  email: string
  role: ManagedUserRole
  unitNumber?: string
  password?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json(500, { ok: false, error: 'Missing Supabase env vars.' })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { ok: false, error: 'Missing bearer token.' })
    }
    const token = authHeader.replace('Bearer ', '')

    const authClient = createClient(supabaseUrl, anonKey)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const userResult = await authClient.auth.getUser(token)
    const caller = userResult.data.user
    if (userResult.error || !caller) {
      return json(401, { ok: false, error: 'Invalid session.' })
    }

    const roleResult = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle<{ role: ManagedUserRole }>()

    if (roleResult.error) {
      return json(500, { ok: false, error: roleResult.error.message })
    }
    if (roleResult.data?.role !== 'admin') {
      return json(403, { ok: false, error: 'Only admins can manage users.' })
    }

    const payload = (await req.json()) as Payload
    const email = payload.email?.trim().toLowerCase()
    const role = payload.role
    const unitNumber = payload.unitNumber?.trim() || null
    const mode = payload.mode
    const password = payload.password?.trim()

    if (!email || !role || !mode) {
      return json(400, { ok: false, error: 'Missing required fields.' })
    }

    const allowedRoles: ManagedUserRole[] = [
      'admin',
      'resident',
      'tenant',
      'guard',
      'board_member',
      'maintenance',
    ]
    if (!allowedRoles.includes(role)) {
      return json(400, { ok: false, error: 'Invalid role.' })
    }

    let userId: string | null = null
    if (mode === 'invite') {
      const invite = await adminClient.auth.admin.inviteUserByEmail(email)
      if (invite.error || !invite.data.user) {
        return json(400, { ok: false, error: invite.error?.message ?? 'Invite failed.' })
      }
      userId = invite.data.user.id
    } else {
      if (!password || password.length < 8) {
        return json(400, { ok: false, error: 'Password must be at least 8 chars.' })
      }
      const created = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (created.error || !created.data.user) {
        return json(400, { ok: false, error: created.error?.message ?? 'Create user failed.' })
      }
      userId = created.data.user.id
    }

    if (!userId) {
      return json(500, { ok: false, error: 'No user id returned.' })
    }

    const profileUpsert = await adminClient.from('profiles').upsert(
      {
        user_id: userId,
        role,
        unit_number: unitNumber,
      },
      { onConflict: 'user_id' },
    )

    if (profileUpsert.error) {
      return json(500, { ok: false, error: profileUpsert.error.message })
    }

    return json(200, {
      ok: true,
      userId,
      email,
      mode,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return json(500, { ok: false, error: message })
  }
})
