import { describe, expect, it } from 'vitest'
import {
  buildQrImageUrl,
  buildQrPayload,
  buildDepartmentDisplayCode,
  findPassesByDepartmentSequence,
  findPassesByLast4,
  formatDepartmentCode,
  getLast4Code,
  getNextDepartmentSequence,
  normalizeDepartmentCode,
  parseDepartmentDisplayCode,
} from './qrLogic'
import type { QrPass } from '../../shared/domain/demoData'

const basePass: QrPass = {
  id: 'a',
  label: 'test',
  unitId: 'Casa 1',
  createdByUserId: 'u',
  type: 'single_use',
  status: 'active',
  qrValue: 'QR-A',
  displayCode: 'ABCD-1234',
}

describe('qr last4', () => {
  it('extrae ultimos 4', () => {
    expect(getLast4Code('ABCD-1234')).toBe('1234')
  })

  it('encuentra coincidencia por ultimos 4', () => {
    const matches = findPassesByLast4([basePass], '1234')
    expect(matches).toHaveLength(1)
  })

  it('detecta potencial colision con dos coincidencias', () => {
    const matches = findPassesByLast4(
      [basePass, { ...basePass, id: 'b', displayCode: 'WXYZ-1234', qrValue: 'QR-B' }],
      '1234',
    )
    expect(matches).toHaveLength(2)
  })

  it('parsea display code por departamento', () => {
    expect(parseDepartmentDisplayCode('1141-0001')).toEqual({
      departmentCode: '1141',
      sequenceCode: '0001',
    })
  })

  it('calcula secuencia autoincremental por departamento', () => {
    const passes: QrPass[] = [
      { ...basePass, displayCode: '1141-0001' },
      { ...basePass, id: 'b', displayCode: '1141-0003' },
      { ...basePass, id: 'c', displayCode: '2201-0007' },
    ]
    expect(getNextDepartmentSequence(passes, '1141')).toBe(4)
    expect(buildDepartmentDisplayCode('1141', 4)).toBe('1141-0004')
  })

  it('busca por departamento + numero', () => {
    const passes: QrPass[] = [{ ...basePass, displayCode: '1141-0001' }]
    expect(findPassesByDepartmentSequence(passes, '1141', '0001')).toHaveLength(1)
  })

  it('normaliza y formatea departamento', () => {
    expect(normalizeDepartmentCode('11 41')).toBe('1141')
    expect(formatDepartmentCode('11 41')).toBe('1141')
  })

  it('genera payload QR con campos operativos', () => {
    const payload = buildQrPayload({
      id: 'qr-1',
      displayCode: '1141-0004',
      qrValue: 'QR-1141-0004',
      unitId: '11-41',
      status: 'active',
      type: 'single_use',
      endAt: '2026-02-20T12:00:00.000Z',
      visitorName: 'Marco',
      maxPersons: 2,
    })
    expect(payload).toContain('"code":"1141-0004"')
    expect(payload).toContain('"visitor":"Marco"')
    expect(payload).toContain('"maxPersons":2')
  })

  it('construye URL de imagen QR con tamano limitado', () => {
    const url = buildQrImageUrl('abc', 9999)
    expect(url).toContain('size=820x820')
    expect(url).toContain('data=abc')
  })
})
