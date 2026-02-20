import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type ManagedUserRole =
  | 'admin'
  | 'resident'
  | 'tenant'
  | 'guard'
  | 'board_member'
  | 'maintenance'

type PushPayload = {
  userId?: string
  title?: string
  body?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
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

function toMailtoContact(raw: string | null): string {
  if (!raw) {
    return 'mailto:no-reply@example.com'
  }
  return raw.startsWith('mailto:') ? raw : `mailto:${raw}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidPublicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY')
    const vapidContact = toMailtoContact(Deno.env.get('WEB_PUSH_CONTACT_EMAIL'))

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: 'Missing Supabase env vars (URL/SERVICE_ROLE).' })
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
      return json(500, {
        ok: false,
        error: 'Missing WEB_PUSH_VAPID_PUBLIC_KEY/WEB_PUSH_VAPID_PRIVATE_KEY.',
      })
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
      return json(401, {
        ok: false,
        error: `Invalid session: ${userResult.error?.message ?? 'unknown error'}`,
      })
    }

    const roleResult = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle<{ role: ManagedUserRole }>()

    if (roleResult.error) {
      return json(500, { ok: false, error: roleResult.error.message })
    }

    const payload = (await req.json()) as PushPayload
    const targetUserId = payload.userId?.trim() || caller.id
    const callerRole = roleResult.data?.role ?? null
    const canSendToOtherUser = callerRole === 'admin'

    if (targetUserId !== caller.id && !canSendToOtherUser) {
      return json(403, { ok: false, error: 'Only admins can send to a different user.' })
    }

    const title = payload.title?.trim() || 'Privada Reforma'
    const body = payload.body?.trim() || 'Tienes una nueva actualizacion.'
    const url = payload.url?.trim() || '/app/home'
    const tag = payload.tag?.trim() || 'privada-default'
    const data = payload.data ?? {}

    webpush.setVapidDetails(vapidContact, vapidPublicKey, vapidPrivateKey)

    const subscriptionsResult = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', targetUserId)
      .eq('enabled', true)

    if (subscriptionsResult.error) {
      return json(500, { ok: false, error: subscriptionsResult.error.message })
    }

    const subscriptions = (subscriptionsResult.data ?? []) as PushSubscriptionRow[]
    if (subscriptions.length === 0) {
      return json(200, { ok: true, sent: 0, removed: 0, message: 'No active subscriptions.' })
    }

    const pushBody = JSON.stringify({ title, body, url, tag, data })
    let sent = 0
    let removed = 0

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          pushBody,
        )
        sent += 1
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null
        if (statusCode === 404 || statusCode === 410) {
          await adminClient.from('push_subscriptions').delete().eq('id', subscription.id)
          removed += 1
        }
      }
    }

    return json(200, {
      ok: true,
      sent,
      removed,
      targetUserId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return json(500, { ok: false, error: message })
  }
})
