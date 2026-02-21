import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type ManagedUserRole =
  | 'admin'
  | 'resident'
  | 'tenant'
  | 'guard'
  | 'board_member'
  | 'maintenance'

type TargetMode = 'user' | 'unit' | 'role' | 'all'

type Payload = {
  targetMode: TargetMode
  userId?: string
  unitNumber?: string
  role?: ManagedUserRole
  includeCaller?: boolean
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

function unique(values: string[]) {
  return Array.from(new Set(values))
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
    if (roleResult.data?.role !== 'admin') {
      return json(403, { ok: false, error: 'Only admins can send targeted notifications.' })
    }

    const payload = (await req.json()) as Payload
    if (!payload.targetMode) {
      return json(400, { ok: false, error: 'targetMode is required.' })
    }

    const title = payload.title?.trim() || 'Privada Reforma'
    const body = payload.body?.trim()
    if (!body) {
      return json(400, { ok: false, error: 'body is required.' })
    }
    const url = payload.url?.trim() || '/app/home'
    const tag = payload.tag?.trim() || 'admin-push'
    const includeCaller = payload.includeCaller === true

    let targetUserIds: string[] = []
    if (payload.targetMode === 'user') {
      const userId = payload.userId?.trim()
      if (!userId) {
        return json(400, { ok: false, error: 'userId is required for targetMode=user.' })
      }
      targetUserIds = [userId]
    } else if (payload.targetMode === 'unit') {
      const unitNumber = payload.unitNumber?.trim()
      if (!unitNumber) {
        return json(400, { ok: false, error: 'unitNumber is required for targetMode=unit.' })
      }
      const profiles = await adminClient
        .from('profiles')
        .select('user_id')
        .eq('unit_number', unitNumber)
      if (profiles.error) {
        return json(500, { ok: false, error: profiles.error.message })
      }
      targetUserIds = (profiles.data ?? []).map((row) => row.user_id)
    } else if (payload.targetMode === 'role') {
      const role = payload.role
      if (!role) {
        return json(400, { ok: false, error: 'role is required for targetMode=role.' })
      }
      const profiles = await adminClient.from('profiles').select('user_id').eq('role', role)
      if (profiles.error) {
        return json(500, { ok: false, error: profiles.error.message })
      }
      targetUserIds = (profiles.data ?? []).map((row) => row.user_id)
    } else {
      const profiles = await adminClient.from('profiles').select('user_id')
      if (profiles.error) {
        return json(500, { ok: false, error: profiles.error.message })
      }
      targetUserIds = (profiles.data ?? []).map((row) => row.user_id)
    }

    targetUserIds = unique(targetUserIds)
    if (!includeCaller) {
      targetUserIds = targetUserIds.filter((userId) => userId !== caller.id)
    }
    if (targetUserIds.length === 0) {
      return json(200, { ok: true, sent: 0, removed: 0, message: 'No target users.' })
    }

    webpush.setVapidDetails(vapidContact, vapidPublicKey, vapidPrivateKey)

    const subscriptionsResult = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', targetUserIds)
      .eq('enabled', true)

    if (subscriptionsResult.error) {
      return json(500, { ok: false, error: subscriptionsResult.error.message })
    }

    const subscriptions = (subscriptionsResult.data ?? []) as PushSubscriptionRow[]
    if (subscriptions.length === 0) {
      return json(200, { ok: true, sent: 0, removed: 0, message: 'No active subscriptions.' })
    }

    const pushBody = JSON.stringify({
      title,
      body,
      url,
      tag,
      data: payload.data ?? {},
    })

    let sent = 0
    let removed = 0
    let failed = 0
    let firstFailureMessage: string | null = null
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
        } else {
          failed += 1
          if (!firstFailureMessage) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown push error.'
            firstFailureMessage = statusCode ? `status ${statusCode}: ${errorMessage}` : errorMessage
          }
        }
      }
    }

    if (sent === 0 && failed > 0) {
      return json(502, {
        ok: false,
        error: `Push provider rejected notifications (${failed} failed). ${firstFailureMessage ?? ''}`.trim(),
        sent,
        removed,
        failed,
        targetUsers: targetUserIds.length,
      })
    }

    return json(200, { ok: true, sent, removed, failed, targetUsers: targetUserIds.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return json(500, { ok: false, error: message })
  }
})
