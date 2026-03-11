import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14.25.0'

type PaymentStatus = 'pending' | 'requires_action' | 'paid' | 'failed' | 'canceled' | 'refunded'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

async function upsertChargeStatus(input: {
  adminClient: ReturnType<typeof createClient>
  chargeId: string
  nextStatus: PaymentStatus
  eventType: string
  metadata?: Record<string, unknown>
}) {
  const { adminClient, chargeId, nextStatus, eventType, metadata } = input
  const chargeResult = await adminClient
    .from('payment_charges')
    .select('id, status, amount_mxn, currency, reservation_id')
    .eq('id', chargeId)
    .maybeSingle<{
      id: string
      status: PaymentStatus
      amount_mxn: number
      currency: 'MXN'
      reservation_id: string | null
    }>()

  if (chargeResult.error || !chargeResult.data) {
    return { ok: false, error: chargeResult.error?.message ?? 'Charge not found.' }
  }

  const currentStatus = chargeResult.data.status
  if (currentStatus === nextStatus) {
    return { ok: true, reservationId: chargeResult.data.reservation_id, skipped: true }
  }

  const chargeUpdate = await adminClient
    .from('payment_charges')
    .update({ status: nextStatus })
    .eq('id', chargeId)

  if (chargeUpdate.error) {
    return { ok: false, error: chargeUpdate.error.message }
  }

  const ledgerInsert = await adminClient.from('payment_ledger_entries').insert({
    id: randomId('pledger'),
    charge_id: chargeId,
    event_type: eventType,
    previous_status: currentStatus,
    new_status: nextStatus,
    amount_mxn: chargeResult.data.amount_mxn,
    currency: chargeResult.data.currency,
    source: 'stripe_webhook',
    metadata: metadata ?? {},
  })
  if (ledgerInsert.error) {
    return { ok: false, error: ledgerInsert.error.message }
  }

  return { ok: true, reservationId: chargeResult.data.reservation_id, skipped: false }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return json(405, { ok: false, error: 'Method not allowed.' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
      return json(500, { ok: false, error: 'Missing required env vars.' })
    }

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return json(400, { ok: false, error: 'Missing stripe-signature header.' })
    }

    const rawBody = await req.text()
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' })
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      stripeWebhookSecret,
    )

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const webhookInsert = await adminClient.from('payment_webhook_events').insert({
      id: randomId('pwe'),
      provider: 'stripe',
      provider_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    })
    if (webhookInsert.error) {
      if (webhookInsert.error.message.toLowerCase().includes('duplicate')) {
        return json(200, { ok: true, duplicate: true })
      }
      return json(500, { ok: false, error: webhookInsert.error.message })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const chargeId = session.metadata?.charge_id
      const reservationId = session.metadata?.reservation_id
      if (!chargeId) {
        return json(200, { ok: true, skipped: true, reason: 'missing charge_id metadata' })
      }

      const statusResult = await upsertChargeStatus({
        adminClient,
        chargeId,
        nextStatus: 'paid',
        eventType: event.type,
        metadata: {
          checkoutSessionId: session.id,
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        },
      })
      if (!statusResult.ok) {
        return json(500, { ok: false, error: statusResult.error })
      }

      const updateAttempt = await adminClient
        .from('payment_attempts')
        .insert({
          id: randomId('payatt'),
          charge_id: chargeId,
          provider: 'stripe',
          provider_checkout_session_id: session.id,
          status: 'paid',
          idempotency_key: `webhook-${event.id}`,
          request_payload: {},
          response_payload: {
            eventId: event.id,
            paymentStatus: session.payment_status,
          },
        })
      if (updateAttempt.error && !updateAttempt.error.message.toLowerCase().includes('duplicate')) {
        return json(500, { ok: false, error: updateAttempt.error.message })
      }

      const finalReservationId = statusResult.reservationId ?? reservationId ?? null
      if (finalReservationId) {
        const reservationUpdate = await adminClient
          .from('reservations')
          .update({
            status: 'active',
            payment_status: 'paid',
            payment_charge_id: chargeId,
          })
          .eq('id', finalReservationId)
        if (reservationUpdate.error) {
          return json(500, { ok: false, error: reservationUpdate.error.message })
        }
      }

      const chargeProviderUpdate = await adminClient
        .from('payment_charges')
        .update({
          provider_checkout_session_id: session.id,
          provider_payment_intent_id:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
        })
        .eq('id', chargeId)

      if (chargeProviderUpdate.error) {
        return json(500, { ok: false, error: chargeProviderUpdate.error.message })
      }

      return json(200, { ok: true })
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      const chargeId = session.metadata?.charge_id
      if (!chargeId) {
        return json(200, { ok: true, skipped: true, reason: 'missing charge_id metadata' })
      }
      const statusResult = await upsertChargeStatus({
        adminClient,
        chargeId,
        nextStatus: 'canceled',
        eventType: event.type,
        metadata: { checkoutSessionId: session.id },
      })
      if (!statusResult.ok) {
        return json(500, { ok: false, error: statusResult.error })
      }
      if (statusResult.reservationId) {
        await adminClient
          .from('reservations')
          .update({ payment_status: 'canceled', status: 'cancelled' })
          .eq('id', statusResult.reservationId)
      }
      return json(200, { ok: true })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const chargeLookup = await adminClient
        .from('payment_charges')
        .select('id')
        .eq('provider_payment_intent_id', paymentIntent.id)
        .maybeSingle<{ id: string }>()
      if (chargeLookup.error || !chargeLookup.data) {
        return json(200, { ok: true, skipped: true })
      }
      const statusResult = await upsertChargeStatus({
        adminClient,
        chargeId: chargeLookup.data.id,
        nextStatus: 'failed',
        eventType: event.type,
        metadata: { paymentIntentId: paymentIntent.id },
      })
      if (!statusResult.ok) {
        return json(500, { ok: false, error: statusResult.error })
      }
      return json(200, { ok: true })
    }

    return json(200, { ok: true, ignored: true, eventType: event.type })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return json(500, { ok: false, error: message })
  }
})
