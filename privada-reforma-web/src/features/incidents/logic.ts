import type { Incident } from '../../shared/domain/demoData'

const SLA_MINUTES = 15

const priorityWeight: Record<Incident['priority'], number> = {
  high: 3,
  medium: 2,
  low: 1,
}

export function calculateSupportScore(votes: Incident['votes']) {
  return votes.reduce((acc, vote) => acc + vote.value, 0)
}

export function updateVote(
  incidents: Incident[],
  incidentId: string,
  userId: string,
  newValue: 1 | -1,
): Incident[] {
  return incidents.map((incident) => {
    if (incident.id !== incidentId) {
      return incident
    }

    const existingVote = incident.votes.find((vote) => vote.userId === userId)
    let nextVotes = incident.votes

    if (!existingVote) {
      nextVotes = [
        ...incident.votes,
        { userId, value: newValue, votedAt: new Date().toISOString() },
      ]
    } else if (existingVote.value === newValue) {
      nextVotes = incident.votes.filter((vote) => vote.userId !== userId)
    } else {
      nextVotes = incident.votes.map((vote) =>
        vote.userId === userId
          ? { ...vote, value: newValue, votedAt: new Date().toISOString() }
          : vote,
      )
    }

    return {
      ...incident,
      votes: nextVotes,
      supportScore: calculateSupportScore(nextVotes),
    }
  })
}

export function getSlaDeadline(createdAt: string) {
  return new Date(createdAt).getTime() + SLA_MINUTES * 60 * 1000
}

export function getSlaRemainingMs(incident: Incident, now = Date.now()) {
  return getSlaDeadline(incident.createdAt) - now
}

export function isSlaOverdue(incident: Incident, now = Date.now()) {
  return !incident.acknowledgedAt && getSlaRemainingMs(incident, now) < 0
}

export function formatCountdown(remainingMs: number) {
  const abs = Math.abs(remainingMs)
  const mins = Math.floor(abs / 60000)
  const secs = Math.floor((abs % 60000) / 1000)
  const label = `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
  return remainingMs < 0 ? `-${label}` : label
}

export function canResolveIncident(incident: Incident) {
  return incident.guardActions.some(
    (action) => Boolean(action.note?.trim()) || Boolean(action.photoUrl?.trim()),
  )
}

export function sortIncidentsForGuard(incidents: Incident[], now = Date.now()) {
  return [...incidents].sort((left, right) => {
    const leftSla = getSlaRemainingMs(left, now)
    const rightSla = getSlaRemainingMs(right, now)
    if (leftSla !== rightSla) {
      return leftSla - rightSla
    }

    const leftPriority = priorityWeight[left.priority]
    const rightPriority = priorityWeight[right.priority]
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  })
}
