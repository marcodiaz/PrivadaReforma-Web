import type { QrPass } from '../../shared/domain/demoData'

export function getLast4Code(displayCode: string) {
  return displayCode.slice(-4).toUpperCase()
}

export function findPassesByLast4(qrPasses: QrPass[], code4: string) {
  const normalized = code4.trim().toUpperCase()
  if (normalized.length !== 4) {
    return []
  }
  return qrPasses.filter((pass) => getLast4Code(pass.displayCode) === normalized)
}

export function normalizeDepartmentCode(input: string) {
  return input.replace(/[^0-9]/g, '')
}

export function formatDepartmentCode(input: string) {
  return normalizeDepartmentCode(input).slice(0, 4)
}

export function parseDepartmentDisplayCode(displayCode: string): {
  departmentCode: string
  sequenceCode: string
} | null {
  const match = /^(\d{4})-(\d{4})$/.exec(displayCode.trim())
  if (!match) {
    return null
  }
  return {
    departmentCode: match[1] ?? '',
    sequenceCode: match[2] ?? '',
  }
}

export function buildDepartmentDisplayCode(
  departmentCode: string,
  sequenceNumber: number,
) {
  return `${normalizeDepartmentCode(departmentCode).slice(0, 4)}-${sequenceNumber
    .toString()
    .padStart(4, '0')}`
}

export function getNextDepartmentSequence(
  qrPasses: QrPass[],
  departmentCode: string,
) {
  const maxSequence = qrPasses.reduce((max, pass) => {
    const parsed = parseDepartmentDisplayCode(pass.displayCode)
    if (!parsed || parsed.departmentCode !== departmentCode) {
      return max
    }
    const numericSequence = Number.parseInt(parsed.sequenceCode, 10)
    if (Number.isNaN(numericSequence)) {
      return max
    }
    return Math.max(max, numericSequence)
  }, 0)

  return maxSequence + 1
}

export function findPassesByDepartmentSequence(
  qrPasses: QrPass[],
  departmentCode: string,
  sequenceCode: string,
) {
  const normalizedDepartment = normalizeDepartmentCode(departmentCode)
  const normalizedSequence = sequenceCode.trim()
  if (!/^\d{4}$/.test(normalizedDepartment) || !/^\d{4}$/.test(normalizedSequence)) {
    return []
  }
  const fullCode = buildDepartmentDisplayCode(
    normalizedDepartment,
    Number.parseInt(normalizedSequence, 10),
  )
  return qrPasses.filter((pass) => pass.displayCode === fullCode)
}

type QrPayloadInput = Pick<
  QrPass,
  'id' | 'displayCode' | 'qrValue' | 'unitId' | 'status' | 'type' | 'endAt'
> & {
  visitorName?: string
  maxPersons?: number
}

export function buildQrPayload(input: QrPayloadInput) {
  return JSON.stringify({
    qrId: input.id,
    code: input.displayCode,
    token: input.qrValue,
    unit: input.unitId,
    visitor: input.visitorName?.trim() || 'VISITA',
    maxPersons: input.maxPersons ?? 1,
    status: input.status,
    type: input.type,
    expiresAt: input.endAt ?? null,
  })
}

export function buildQrImageUrl(payload: string, size = 420) {
  const safeSize = Number.isFinite(size) ? Math.max(180, Math.min(820, Math.round(size))) : 420
  const encoded = encodeURIComponent(payload)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${safeSize}x${safeSize}&format=png&ecc=M&data=${encoded}`
}

type CreateQrPassRecordInput = {
  id: string
  createdByUserId: string
  sessionUnitNumber?: string
  label: string
  unitId: string
  visitorName?: string
  maxUses?: number
  maxPersons?: number
  accessMessage?: string
  accessType: 'temporal' | 'time_limit' | 'delivery'
  timeLimit?: 'week' | 'month' | 'permanent'
  deliveryProvider?: string
  visitorPhotoUrl?: string
  qrValue: string
  existingPasses: QrPass[]
  nowMs?: number
}

export function createQrPassRecord(input: CreateQrPassRecordInput) {
  const type =
    input.accessType === 'temporal'
      ? 'single_use'
      : input.accessType === 'time_limit'
        ? 'time_window'
        : 'delivery_open'
  const normalizedDepartment = normalizeDepartmentCode(input.sessionUnitNumber ?? '')
  if (!/^\d{4}$/.test(normalizedDepartment)) {
    return { ok: false, error: 'Tu cuenta no tiene un departamento valido de 4 digitos.' } as const
  }
  if (!/[12]$/.test(normalizedDepartment)) {
    return { ok: false, error: 'El ultimo digito del departamento debe ser 1 o 2.' } as const
  }

  const now = input.nowMs ?? Date.now()
  let startAt: string | undefined
  let endAt: string | undefined
  if (type === 'time_window') {
    startAt = new Date(now).toISOString()
    if (input.timeLimit === 'week') {
      endAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (input.timeLimit === 'month') {
      endAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
    } else if (input.timeLimit === 'permanent') {
      endAt = undefined
    } else {
      return { ok: false, error: 'Selecciona una vigencia para time limit.' } as const
    }
  } else if (type === 'single_use') {
    endAt = new Date(now + 3 * 60 * 60 * 1000).toISOString()
  } else {
    startAt = new Date(now).toISOString()
    endAt = new Date(now + 6 * 60 * 60 * 1000).toISOString()
  }

  const isDelivery = type === 'delivery_open'
  const normalizedDeliveryProvider = input.deliveryProvider?.trim()
  const normalizedVisitorName = input.visitorName?.trim()
  const normalizedLabel = input.label.trim()

  return {
    ok: true,
    pass: {
      id: input.id,
      label:
        normalizedLabel ||
        (isDelivery
          ? `Entrega${normalizedDeliveryProvider ? ` ${normalizedDeliveryProvider}` : ''}`
          : 'Visita'),
      unitId: input.unitId.trim(),
      createdByUserId: input.createdByUserId,
      visitorName: isDelivery ? 'REPARTIDOR' : normalizedVisitorName || 'VISITA',
      maxUses: isDelivery ? 1 : input.maxUses && input.maxUses > 0 ? Math.floor(input.maxUses) : 1,
      maxPersons:
        isDelivery ? 1 : input.maxPersons && input.maxPersons > 0 ? Math.floor(input.maxPersons) : 1,
      accessMessage: input.accessMessage?.trim(),
      deliveryProvider: isDelivery ? normalizedDeliveryProvider || undefined : undefined,
      type,
      startAt,
      endAt,
      visitorPhotoUrl: input.visitorPhotoUrl?.trim(),
      status: 'active',
      qrValue: input.qrValue,
      displayCode: buildDepartmentDisplayCode(
        normalizedDepartment,
        getNextDepartmentSequence(input.existingPasses, normalizedDepartment),
      ),
    } satisfies QrPass,
  } as const
}

export function getEffectiveQrStatus(pass: QrPass, now = new Date()) {
  if (pass.status !== 'active') {
    return pass.status
  }
  if (pass.type === 'time_window' && pass.endAt && new Date(pass.endAt) < now) {
    return 'expired'
  }
  return pass.status
}
