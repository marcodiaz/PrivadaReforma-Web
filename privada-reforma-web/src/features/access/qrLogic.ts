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
  const digits = normalizeDepartmentCode(input).slice(0, 4)
  if (digits.length <= 2) {
    return digits
  }
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

export function parseDepartmentDisplayCode(displayCode: string): {
  departmentCode: string
  sequenceCode: string
} | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(displayCode.trim())
  if (!match) {
    return null
  }
  return {
    departmentCode: `${match[1] ?? ''}${match[2] ?? ''}`,
    sequenceCode: match[3] ?? '',
  }
}

export function buildDepartmentDisplayCode(
  departmentCode: string,
  sequenceNumber: number,
) {
  return `${formatDepartmentCode(departmentCode)}-${sequenceNumber
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
