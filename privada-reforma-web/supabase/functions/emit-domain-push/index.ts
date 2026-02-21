import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type ManagedUserRole =
  | 'admin'
  | 'resident'
  | 'tenant'
  | 'guard'
  | 'board_member'
  | 'maintenance'

type EventType =
  | 'package_registered'
  | 'package_ready'
  | 'package_delivered'
  | 'incident_created'
  | 'incident_status_updated'
  | 'report_created'

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  user_id: string
}

type ProfileRow = {
  user_id: string
  role: ManagedUserRole
  unit_number: string | null
}

type Payload = {
  eventType: EventType
  unitNumber?: string
  incidentId?: string
  incidentTitle?: string
  incidentStatus?: 'open' | 'acknowledged' | 'in_progress' | 'resolved'
  incidentCreatedByUserId?: string
  reportTargetType?: 'incident' | 'pet_post' | 'marketplace_post'
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

function normalizeUnitNumber(input?: string) {
  const value = input?.trim()
  return value && value.length > 0 ? value : null
}

function roleAllowedForEvent(eventType: EventType, role: ManagedUserRole) {
  if (eventType === 'package_registered' || eventType === 'package_delivered') {
    return role === 'admin' || role === 'guard' || role === 'maintenance'
  }
  if (eventType === 'package_ready') {
    return role === 'admin' || role === 'resident' || role === 'tenant' || role === 'board_member'
  }
  if (eventType === 'incident_created') {
    return true
  }
  if (eventType === 'incident_status_updated') {
    return role === 'admin' || role === 'guard' || role === 'maintenance'
  }
  if (eventType === 'report_created') {
    return true
  }
  return false
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

    const profileResult = await adminClient
      .from('profiles')
      .select('user_id, role, unit_number')
      .eq('user_id', caller.id)
      .maybeSingle<ProfileRow>()

    if (profileResult.error || !profileResult.data) {
      return json(403, { ok: false, error: 'Caller profile not found.' })
    }

    const payload = (await req.json()) as Payload
    if (!payload.eventType) {
      return json(400, { ok: false, error: 'eventType is required.' })
    }
    if (!roleAllowedForEvent(payload.eventType, profileResult.data.role)) {
      return json(403, { ok: false, error: 'Caller role is not allowed for this event.' })
    }

    const targetUserIds: string[] = []
    const unitNumber = normalizeUnitNumber(payload.unitNumber)

    if (payload.eventType === 'package_registered' || payload.eventType === 'package_delivered') {
      if (!unitNumber) {
        return json(400, { ok: false, error: 'unitNumber is required for package events.' })
      }
      const unitResidents = await adminClient
        .from('profiles')
        .select('user_id')
        .eq('unit_number', unitNumber)
        .in('role', ['resident', 'tenant'])
      if (unitResidents.error) {
        return json(500, { ok: false, error: unitResidents.error.message })
      }
      targetUserIds.push(...(unitResidents.data ?? []).map((entry) => entry.user_id))
    }

    if (payload.eventType === 'package_ready') {
      const guardAndAdmin = await adminClient
        .from('profiles')
        .select('user_id')
        .in('role', ['guard', 'admin', 'maintenance'])
      if (guardAndAdmin.error) {
        return json(500, { ok: false, error: guardAndAdmin.error.message })
      }
      targetUserIds.push(...(guardAndAdmin.data ?? []).map((entry) => entry.user_id))
    }

    if (payload.eventType === 'incident_created') {
      const reviewers = await adminClient
        .from('profiles')
        .select('user_id')
        .in('role', ['guard', 'admin', 'board_member'])
      if (reviewers.error) {
        return json(500, { ok: false, error: reviewers.error.message })
      }
      targetUserIds.push(...(reviewers.data ?? []).map((entry) => entry.user_id))
    }

    if (payload.eventType === 'incident_status_updated') {
      if (payload.incidentCreatedByUserId) {
        targetUserIds.push(payload.incidentCreatedByUserId)
      }
    }

    if (payload.eventType === 'report_created') {
      const moderators = await adminClient
        .from('profiles')
        .select('user_id')
        .in('role', ['admin', 'board_member'])
      if (moderators.error) {
        return json(500, { ok: false, error: moderators.error.message })
      }
      targetUserIds.push(...(moderators.data ?? []).map((entry) => entry.user_id))
    }

    const filteredTargetUserIds = unique(targetUserIds).filter((userId) => userId !== caller.id)
    if (filteredTargetUserIds.length === 0) {
      return json(200, { ok: true, sent: 0, removed: 0, skipped: true })
    }

    const titleByEvent: Record<EventType, string> = {
      package_registered: 'Paquete recibido',
      package_ready: 'Paquete listo para entrega',
      package_delivered: 'Paquete entregado',
      incident_created: 'Nueva incidencia',
      incident_status_updated: 'Actualizacion de incidencia',
      report_created: 'Nuevo reporte de moderacion',
    }

    const bodyByEvent: Record<EventType, string> = {
      package_registered: `Se registro un paquete para la unidad ${unitNumber ?? '-'}.`,
      package_ready: `La unidad ${unitNumber ?? '-'} confirmo recepcion de paquete.`,
      package_delivered: `Paquete entregado para la unidad ${unitNumber ?? '-'}.`,
      incident_created: payload.incidentTitle?.trim()
        ? `Se reporto: ${payload.incidentTitle.trim()}.`
        : 'Se reporto una nueva incidencia.',
      incident_status_updated: payload.incidentStatus
        ? `Estado actualizado a: ${payload.incidentStatus}.`
        : 'Tu incidencia tiene una nueva actualizacion.',
      report_created: payload.reportTargetType
        ? `Se reporto contenido tipo ${payload.reportTargetType}.`
        : 'Se reporto contenido para revision.',
    }

    const urlByEvent: Record<EventType, string> = {
      package_registered: '/app/packages',
      package_ready: '/guard/packages',
      package_delivered: '/app/packages',
      incident_created: payload.incidentId
        ? `/app/incidents?incidentId=${encodeURIComponent(payload.incidentId)}`
        : '/app/incidents',
      incident_status_updated: payload.incidentId
        ? `/app/incidents?incidentId=${encodeURIComponent(payload.incidentId)}`
        : '/app/incidents',
      report_created: '/admin/reports',
    }

    webpush.setVapidDetails(vapidContact, vapidPublicKey, vapidPrivateKey)

    const subscriptionsResult = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .in('user_id', filteredTargetUserIds)
      .eq('enabled', true)

    if (subscriptionsResult.error) {
      return json(500, { ok: false, error: subscriptionsResult.error.message })
    }

    const subscriptions = (subscriptionsResult.data ?? []) as PushSubscriptionRow[]
    if (subscriptions.length === 0) {
      return json(200, { ok: true, sent: 0, removed: 0, skipped: true })
    }

    const pushBody = JSON.stringify({
      title: titleByEvent[payload.eventType],
      body: bodyByEvent[payload.eventType],
      url: urlByEvent[payload.eventType],
      tag: `${payload.eventType}-${unitNumber ?? 'global'}`,
      data: {
        eventType: payload.eventType,
        incidentId: payload.incidentId ?? null,
      },
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
        eventType: payload.eventType,
      })
    }

    return json(200, {
      ok: true,
      sent,
      removed,
      failed,
      eventType: payload.eventType,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return json(500, { ok: false, error: message })
  }
})
