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
