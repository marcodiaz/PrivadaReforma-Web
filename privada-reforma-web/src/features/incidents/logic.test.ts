import { describe, expect, it } from 'vitest'
import { type Incident } from '../../shared/domain/demoData'
import {
  acknowledgeIncidentRecord,
  appendGuardAction,
  canResolveIncident,
  createIncidentRecord,
  formatCountdown,
  getSlaRemainingMs,
  isSlaOverdue,
  resolveIncidentRecord,
  updateVote,
} from './logic'

function createIncident(seed?: Partial<Incident>): Incident {
  return {
    id: 'inc-test',
    title: 'Incidente test',
    description: 'detalle',
    category: 'other',
    priority: 'medium',
    createdAt: new Date('2026-02-13T10:00:00.000Z').toISOString(),
    createdByUserId: 'user-1',
    status: 'open',
    supportScore: 0,
    votes: [],
    guardActions: [],
    ...seed,
  }
}

describe('updateVote', () => {
  it('agrega voto +1 cuando no existe', () => {
    const next = updateVote([createIncident()], 'inc-test', 'u1', 1)
    expect(next[0].votes).toHaveLength(1)
    expect(next[0].supportScore).toBe(1)
  })

  it('cambia de +1 a -1', () => {
    const next = updateVote(
      [createIncident({ votes: [{ userId: 'u1', value: 1, votedAt: 'x' }], supportScore: 1 })],
      'inc-test',
      'u1',
      -1,
    )
    expect(next[0].votes[0]?.value).toBe(-1)
    expect(next[0].supportScore).toBe(-1)
  })

  it('presionar mismo voto elimina voto', () => {
    const next = updateVote(
      [createIncident({ votes: [{ userId: 'u1', value: -1, votedAt: 'x' }], supportScore: -1 })],
      'inc-test',
      'u1',
      -1,
    )
    expect(next[0].votes).toHaveLength(0)
    expect(next[0].supportScore).toBe(0)
  })

  it('recalcula score correctamente con varios votos', () => {
    const next = updateVote(
      [
        createIncident({
          votes: [
            { userId: 'u1', value: 1, votedAt: 'x' },
            { userId: 'u2', value: -1, votedAt: 'x' },
          ],
          supportScore: 0,
        }),
      ],
      'inc-test',
      'u3',
      1,
    )
    expect(next[0].supportScore).toBe(1)
  })
})

describe('sla and resolve', () => {
  it('calcula countdown correctamente', () => {
    const incident = createIncident()
    const now = new Date('2026-02-13T10:10:00.000Z').getTime()
    expect(getSlaRemainingMs(incident, now)).toBe(5 * 60 * 1000)
    expect(formatCountdown(getSlaRemainingMs(incident, now))).toBe('05:00')
  })

  it('marca SLA vencido cuando corresponde', () => {
    const incident = createIncident()
    const now = new Date('2026-02-13T10:16:00.000Z').getTime()
    expect(isSlaOverdue(incident, now)).toBe(true)
  })

  it('no permite resolver sin evidencia', () => {
    const noEvidence = createIncident({
      guardActions: [{ at: new Date().toISOString(), note: '   ' }],
    })
    const withEvidence = createIncident({
      guardActions: [{ at: new Date().toISOString(), note: 'Se retiro ruido' }],
    })
    expect(canResolveIncident(noEvidence)).toBe(false)
    expect(canResolveIncident(withEvidence)).toBe(true)
  })

  it('creates and transitions incident records through pure helpers', () => {
    const created = createIncidentRecord({
      id: 'inc-2',
      session: {
        userId: 'user-1',
        email: 'resident@example.com',
        fullName: 'Resident',
        role: 'resident',
        unitNumber: '1141',
      },
      title: ' Porton abierto ',
      description: ' Revisar porton principal ',
      category: 'rules',
      priority: 'high',
      createdAt: '2026-02-13T10:00:00.000Z',
    })
    expect(created?.title).toBe('Porton abierto')

    const acknowledged = acknowledgeIncidentRecord(created!)
    expect(acknowledged.status).toBe('acknowledged')

    const withGuardAction = appendGuardAction(acknowledged, { note: 'Guardia en camino' })
    expect(withGuardAction?.guardActions).toHaveLength(1)

    const resolved = resolveIncidentRecord(withGuardAction!, { note: 'Atendido' })
    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.incident.status).toBe('resolved')
    }
  })
})
