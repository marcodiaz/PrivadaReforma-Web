import { describe, expect, it } from 'vitest'
import { type Incident } from '../../shared/domain/demoData'
import {
  canResolveIncident,
  formatCountdown,
  getSlaRemainingMs,
  isSlaOverdue,
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
})
