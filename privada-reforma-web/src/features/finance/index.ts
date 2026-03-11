export const PAYMENT_STATUS_VALUES = [
  'pending',
  'requires_action',
  'paid',
  'failed',
  'canceled',
  'refunded',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number]

export type PaymentCharge = {
  id: string
  reservationId?: string
  unitNumber: string
  chargeType: 'reservation_fee'
  amountMxn: number
  currency: 'MXN'
  status: PaymentStatus
  provider: 'stripe'
  providerCheckoutSessionId?: string
  providerPaymentIntentId?: string
  metadata?: Record<string, unknown>
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export type PaymentAttempt = {
  id: string
  chargeId: string
  provider: 'stripe'
  providerCheckoutSessionId?: string
  status: PaymentStatus
  idempotencyKey: string
  requestPayload?: Record<string, unknown>
  responsePayload?: Record<string, unknown>
  createdAt: string
}

export type PaymentLedgerEntry = {
  id: string
  chargeId: string
  eventType: string
  previousStatus?: PaymentStatus
  newStatus: PaymentStatus
  amountMxn?: number
  currency?: 'MXN'
  source: string
  metadata?: Record<string, unknown>
  createdAt: string
}
