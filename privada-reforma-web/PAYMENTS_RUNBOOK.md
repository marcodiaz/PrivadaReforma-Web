# Payments Runbook (Phase 1 - Reservation Checkout)

## Feature flags
- Client: `VITE_PAYMENTS_ENABLED=true`
- Edge Functions secret: `PAYMENTS_ENABLED=true`

## Required secrets
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `APP_BASE_URL`

## Functions
- `create-reservation-checkout`
- `stripe-webhook`
- `payments-reconcile`

## Deployment order
1. Apply migration `20260226100000_create_reservations_and_payments.sql`
2. Deploy functions.
3. Set secrets.
4. Keep payments flag OFF in production for initial validation.
5. Enable pilot and monitor.

## Webhook setup
- Endpoint: `/functions/v1/stripe-webhook`
- Events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`

## Reconciliation
- Run `payments-reconcile` daily.
- Review:
  - `mismatches`
  - charges missing provider ids
  - drift between charge status and webhook history

## Operational metrics
- Checkout success rate
- Webhook failure count
- Webhook processing latency
- Reservation activation latency
- Open debt count by unit

## Incident response
1. Disable `PAYMENTS_ENABLED`.
2. Validate Stripe webhook delivery in dashboard.
3. Run reconciliation function.
4. Repair affected rows manually with ledger audit entry.
5. Re-enable flag after verification.
