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
    const appBaseUrl = Deno.env.get('APP_BASE_URL')?.trim()
    const normalizedAppBaseUrl = appBaseUrl ? appBaseUrl.replace(/\/+$/, '') : null

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: 'Missing Supabase env vars (URL/SERVICE_ROLE).' })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { ok: false, error: 'Missing bearer token.' })
    }
    const token = authHeader.replace('Bearer ', '')

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Validate caller session using service role client to avoid publishable/anon key mismatch issues.
    const userResult = await adminClient.auth.getUser(token)
    const caller = userResult.data.user
    if (userResult.error || !caller) {
      return json(401, {
        ok: false,
        error: `Invalid session: ${userResult.error?.message ?? 'unknown error'}`,
      })
    }

    const roleResult = await adminClient
      .from('profiles')
      .select('role, unit_number')
      .eq('user_id', caller.id)
      .maybeSingle<{ role: ManagedUserRole; unit_number: string | null }>()

    if (roleResult.error) {
      return json(500, { ok: false, error: roleResult.error.message })
    }
    const callerRole = roleResult.data?.role
    const callerUnitNumber = roleResult.data?.unit_number?.trim() ?? null
    const callerIsAdmin = callerRole === 'admin'
    const callerIsResident = callerRole === 'resident'

    const payload = (await req.json()) as Payload
    const email = payload.email?.trim().toLowerCase()
    const role = payload.role
    const unitNumber = payload.unitNumber?.trim() || null
    const mode = payload.mode
    const password = payload.password?.trim()

    if (!email || !role || !mode) {
      return json(400, { ok: false, error: 'Missing required fields.' })
    }

    if (!callerIsAdmin) {
      if (!callerIsResident) {
        return json(403, { ok: false, error: 'Only admins or residents can manage users.' })
      }
      if (mode !== 'invite') {
        return json(403, { ok: false, error: 'Residents can only invite tenants.' })
      }
      if (role !== 'tenant') {
        return json(403, { ok: false, error: 'Residents can only invite tenant role.' })
      }
      if (!callerUnitNumber) {
        return json(403, { ok: false, error: 'Resident caller has no unit assigned.' })
      }
      if (!unitNumber || unitNumber !== callerUnitNumber) {
        return json(403, { ok: false, error: 'Residents can only invite tenant for own unit.' })
      }
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
    const requiresDepartment =
      role === 'resident' || role === 'tenant' || role === 'board_member'
    const blocksDepartment = role === 'guard'

    if (requiresDepartment && !unitNumber) {
      return json(400, {
        ok: false,
        error: 'unit_number is required for resident, tenant and board_member.',
      })
    }
    if (blocksDepartment && unitNumber) {
      return json(400, {
        ok: false,
        error: 'unit_number must be empty for guard.',
      })
    }

    let userId: string | null = null
    if (mode === 'invite') {
      const invite = await adminClient.auth.admin.inviteUserByEmail(
        email,
        normalizedAppBaseUrl ? { redirectTo: `${normalizedAppBaseUrl}/login` } : undefined,
      )
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
        unit_number: blocksDepartment ? null : unitNumber,
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
