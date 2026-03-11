import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ProfileRow = {
  role: 'admin' | 'resident' | 'tenant' | 'guard' | 'board_member' | 'maintenance'
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
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: 'Missing Supabase env vars.' })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { ok: false, error: 'Missing bearer token.' })
    }
    const token = authHeader.replace('Bearer ', '')

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const userResult = await adminClient.auth.getUser(token)
    const caller = userResult.data.user
    if (userResult.error || !caller) {
      return json(401, { ok: false, error: 'Invalid session.' })
    }
    const profile = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle<ProfileRow>()
    if (profile.error || !profile.data || profile.data.role !== 'admin') {
      return json(403, { ok: false, error: 'Only admin can run reconciliation.' })
    }

    const charges = await adminClient
      .from('payment_charges')
      .select('id, status, provider_checkout_session_id, provider_payment_intent_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(500)
    if (charges.error) {
      return json(500, { ok: false, error: charges.error.message })
    }

    const events = await adminClient
      .from('payment_webhook_events')
      .select('provider_event_id, event_type, processed_at')
      .order('processed_at', { ascending: false })
      .limit(500)
    if (events.error) {
      return json(500, { ok: false, error: events.error.message })
    }

    const chargeRows = charges.data ?? []
    const mismatches = chargeRows.filter((row) => {
      if (row.status === 'paid') {
        return !row.provider_checkout_session_id
      }
      if (row.status === 'failed') {
        return !row.provider_payment_intent_id && !row.provider_checkout_session_id
      }
      return false
    })

    return json(200, {
      ok: true,
      totals: {
        chargesScanned: chargeRows.length,
        webhookEventsScanned: (events.data ?? []).length,
        mismatches: mismatches.length,
      },
      mismatches,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return json(500, { ok: false, error: message })
  }
})
