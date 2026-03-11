import type { AppSession, Incident } from '../../shared/domain/demoData'

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

export function createIncidentRecord(input: {
  id: string
  session: AppSession
  title: string
  description: string
  category: Incident['category']
  priority: Incident['priority']
  createdAt?: string
}) {
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title || !description) {
    return null
  }

  return {
    id: input.id,
    unitNumber: input.session.unitNumber,
    title,
    description,
    category: input.category,
    priority: input.priority,
    createdAt: input.createdAt ?? new Date().toISOString(),
    createdByUserId: input.session.userId,
    status: 'open',
    supportScore: 0,
    votes: [],
    guardActions: [],
  } satisfies Incident
}

export function acknowledgeIncidentRecord(incident: Incident, acknowledgedAt = new Date().toISOString()) {
  return {
    ...incident,
    status: 'acknowledged',
    acknowledgedAt: incident.acknowledgedAt ?? acknowledgedAt,
  } satisfies Incident
}

export function markIncidentInProgressRecord(incident: Incident) {
  return {
    ...incident,
    status: 'in_progress',
  } satisfies Incident
}

export function appendGuardAction(
  incident: Incident,
  input: { note?: string; photoUrl?: string },
  at = new Date().toISOString(),
) {
  const note = input.note?.trim()
  const photoUrl = input.photoUrl?.trim()
  if (!note && !photoUrl) {
    return null
  }

  return {
    ...incident,
    guardActions: [
      ...incident.guardActions,
      {
        at,
        note,
        photoUrl,
      },
    ],
  } satisfies Incident
}

export function resolveIncidentRecord(
  incident: Incident,
  input?: { note?: string; photoUrl?: string },
  resolvedAt = new Date().toISOString(),
) {
  const withEvidence = input ? appendGuardAction(incident, input, resolvedAt) ?? incident : incident
  if (!canResolveIncident(withEvidence)) {
    return { ok: false, message: 'Para terminar necesitas comentario o evidencia.' } as const
  }

  return {
    ok: true,
    incident: {
      ...withEvidence,
      status: 'resolved',
      resolvedAt,
    } satisfies Incident,
  } as const
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
