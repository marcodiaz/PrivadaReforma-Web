import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14.25.0'

type Payload = {
  amenity: string
  reservationDate: string
  idempotencyKey?: string
  reservationId?: string
}

type ProfileRow = {
  user_id: string
  role: 'admin' | 'resident' | 'tenant' | 'guard' | 'board_member' | 'maintenance'
  unit_number: string | null
}

const RESERVATION_FEE_MXN = 5000
const CURRENCY = 'mxn'

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

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function normalizeBoolean(value?: string | null) {
  return (value ?? '').trim().toLowerCase() === 'true'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return json(405, { ok: false, error: 'Method not allowed.' })
    }

    const paymentsEnabled = normalizeBoolean(Deno.env.get('PAYMENTS_ENABLED'))
    if (!paymentsEnabled) {
      return json(403, { ok: false, error: 'Payments are disabled by feature flag.' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const appBaseUrl = (Deno.env.get('APP_BASE_URL') ?? '').trim().replace(/\/+$/, '')

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !appBaseUrl) {
      return json(500, { ok: false, error: 'Missing required env vars.' })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { ok: false, error: 'Missing bearer token.' })
    }
    const token = authHeader.replace('Bearer ', '')

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' })

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

    const role = profileResult.data.role
    const unitNumber = profileResult.data.unit_number?.trim() ?? null
    if (!['resident', 'tenant', 'admin', 'board_member'].includes(role)) {
      return json(403, { ok: false, error: 'Caller role cannot create reservation checkout.' })
    }
    if (!unitNumber) {
      return json(400, { ok: false, error: 'User has no unit number assigned.' })
    }

    const payload = (await req.json()) as Payload
    const amenity = payload.amenity?.trim()
    const reservationDate = payload.reservationDate?.trim()
    const idempotencyKey = payload.idempotencyKey?.trim() || `reservation-${caller.id}-${Date.now()}`

    if (!amenity || !reservationDate) {
      return json(400, { ok: false, error: 'amenity and reservationDate are required.' })
    }

    const reservationId = payload.reservationId?.trim() || randomId('res')
    const existingReservation = await adminClient
      .from('reservations')
      .select('id, unit_number, status, payment_status, payment_charge_id')
      .eq('id', reservationId)
      .maybeSingle<{
        id: string
        unit_number: string
        status: 'pending_payment' | 'active' | 'cancelled'
        payment_status: 'pending' | 'requires_action' | 'paid' | 'failed' | 'canceled' | 'refunded'
        payment_charge_id: string | null
      }>()

    if (existingReservation.error) {
      return json(500, { ok: false, error: existingReservation.error.message })
    }

    if (existingReservation.data && existingReservation.data.unit_number !== unitNumber) {
      return json(403, { ok: false, error: 'Reservation does not belong to caller unit.' })
    }

    if (!existingReservation.data) {
      const conflict = await adminClient
        .from('reservations')
        .select('id')
        .eq('amenity', amenity)
        .eq('reservation_date', reservationDate)
        .in('status', ['pending_payment', 'active'])
        .limit(1)

      if (conflict.error) {
        return json(500, { ok: false, error: conflict.error.message })
      }
      if ((conflict.data ?? []).length > 0) {
        return json(409, { ok: false, error: 'Amenity already booked for this date.' })
      }

      const reservationInsert = await adminClient.from('reservations').insert({
        id: reservationId,
        unit_number: unitNumber,
        amenity,
        reservation_date: reservationDate,
        fee: RESERVATION_FEE_MXN,
        status: 'pending_payment',
        payment_required: true,
        payment_status: 'pending',
        created_by_user_id: caller.id,
      })
      if (reservationInsert.error) {
        return json(500, { ok: false, error: reservationInsert.error.message })
      }
    }

    let chargeId = existingReservation.data?.payment_charge_id ?? null
    if (!chargeId) {
      const newChargeId = randomId('charge')
      const createCharge = await adminClient.from('payment_charges').insert({
        id: newChargeId,
        reservation_id: reservationId,
        unit_number: unitNumber,
        charge_type: 'reservation_fee',
        amount_mxn: RESERVATION_FEE_MXN,
        currency: 'MXN',
        status: 'pending',
        provider: 'stripe',
        created_by_user_id: caller.id,
        metadata: {
          amenity,
          reservationDate,
        },
      })
      if (createCharge.error) {
        return json(500, { ok: false, error: createCharge.error.message })
      }
      chargeId = newChargeId
      const linkCharge = await adminClient
        .from('reservations')
        .update({ payment_charge_id: chargeId, payment_status: 'pending', status: 'pending_payment' })
        .eq('id', reservationId)
      if (linkCharge.error) {
        return json(500, { ok: false, error: linkCharge.error.message })
      }
    }

    const successUrl = `${appBaseUrl}/app/reservations?payment=success&reservationId=${encodeURIComponent(reservationId)}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${appBaseUrl}/app/reservations?payment=canceled&reservationId=${encodeURIComponent(reservationId)}`
    const stripeSession = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY,
              unit_amount: RESERVATION_FEE_MXN * 100,
              product_data: {
                name: `Reservacion ${amenity}`,
                description: `${reservationDate} - Privada Reforma`,
              },
            },
          },
        ],
        metadata: {
          reservation_id: reservationId,
          charge_id: chargeId,
          unit_number: unitNumber,
        },
      },
      { idempotencyKey: `${idempotencyKey}-${chargeId}` },
    )

    const attemptId = randomId('payatt')
    const createAttempt = await adminClient.from('payment_attempts').insert({
      id: attemptId,
      charge_id: chargeId,
      provider: 'stripe',
      provider_checkout_session_id: stripeSession.id,
      status: 'pending',
      idempotency_key: `${idempotencyKey}-${chargeId}-${stripeSession.id}`,
      request_payload: {
        amenity,
        reservationDate,
      },
      response_payload: {
        checkoutSessionId: stripeSession.id,
      },
    })
    if (createAttempt.error) {
      return json(500, { ok: false, error: createAttempt.error.message })
    }

    const updateCharge = await adminClient
      .from('payment_charges')
      .update({
        provider_checkout_session_id: stripeSession.id,
        status: 'pending',
      })
      .eq('id', chargeId)
    if (updateCharge.error) {
      return json(500, { ok: false, error: updateCharge.error.message })
    }

    return json(200, {
      ok: true,
      reservationId,
      chargeId,
      checkoutSessionId: stripeSession.id,
      checkoutUrl: stripeSession.url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return json(500, { ok: false, error: message })
  }
})
