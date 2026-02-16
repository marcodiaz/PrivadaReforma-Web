import type { UserRole } from '../domain/auth'
import type { Incident } from '../domain/demoData'
import type { Package } from '../domain/packages'
import { supabase } from './client'

const PACKAGE_BUCKET = 'package-photos'
const PACKAGE_PHOTO_SIGNED_URL_SECONDS = 15 * 60

type PackageRow = {
  id: string
  unit_number: string
  photo_url: string
  carrier: string | null
  notes: string | null
  status: Package['status']
  created_at: string
  stored_by_guard_user_id: string
  ready_at: string | null
  delivered_at: string | null
  delivered_by_guard_user_id: string | null
  ready_by_user_id: string | null
}

type IncidentRow = {
  id: string
  unit_number: string
  title: string
  description: string
  category: Incident['category']
  priority: Incident['priority']
  created_at: string
  created_by_user_id: string
  status: Incident['status']
  acknowledged_at: string | null
  resolved_at: string | null
  support_score: number
  votes: Incident['votes']
  guard_actions: Incident['guardActions']
}

type RpcPackageTransitionRow = {
  id: string
}

function mapPackageRow(row: PackageRow): Package {
  return {
    id: row.id,
    unitNumber: row.unit_number,
    photoUrl: row.photo_url,
    carrier: row.carrier ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    storedByGuardUserId: row.stored_by_guard_user_id,
    readyAt: row.ready_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    deliveredByGuardUserId: row.delivered_by_guard_user_id ?? undefined,
    readyByUserId: row.ready_by_user_id ?? undefined,
  }
}

function mapIncidentRow(row: IncidentRow): Incident {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    status: row.status,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    supportScore: row.support_score,
    votes: row.votes ?? [],
    guardActions: row.guard_actions ?? [],
  }
}

function mapPackageToRow(input: Package): PackageRow {
  return {
    id: input.id,
    unit_number: input.unitNumber,
    photo_url: input.photoUrl,
    carrier: input.carrier ?? null,
    notes: input.notes ?? null,
    status: input.status,
    created_at: input.createdAt,
    stored_by_guard_user_id: input.storedByGuardUserId,
    ready_at: input.readyAt ?? null,
    delivered_at: input.deliveredAt ?? null,
    delivered_by_guard_user_id: input.deliveredByGuardUserId ?? null,
    ready_by_user_id: input.readyByUserId ?? null,
  }
}

function mapIncidentToRow(input: Incident): IncidentRow {
  return {
    id: input.id,
    unit_number: input.unitNumber ?? '0000',
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    created_at: input.createdAt,
    created_by_user_id: input.createdByUserId,
    status: input.status,
    acknowledged_at: input.acknowledgedAt ?? null,
    resolved_at: input.resolvedAt ?? null,
    support_score: input.supportScore,
    votes: input.votes,
    guard_actions: input.guardActions,
  }
}

function applyUnitScope<T extends { eq: (...args: [string, string]) => T }>(
  query: T,
  role: UserRole,
  unitNumber?: string,
) {
  if (['resident', 'tenant'].includes(role) && unitNumber?.trim()) {
    return query.eq('unit_number', unitNumber.trim())
  }
  return query
}

export async function fetchPackagesFromSupabase(input: { role: UserRole; unitNumber?: string }) {
  if (!supabase) {
    return null
  }

  let query = supabase
    .from('packages')
    .select(
      'id, unit_number, photo_url, carrier, notes, status, created_at, stored_by_guard_user_id, ready_at, delivered_at, delivered_by_guard_user_id, ready_by_user_id',
    )
    .order('created_at', { ascending: false })

  query = applyUnitScope(query, input.role, input.unitNumber)
  const { data, error } = await query

  if (error || !data) {
    return null
  }

  return data.map((row) => mapPackageRow(row as PackageRow))
}

export async function fetchIncidentsFromSupabase(input: { role: UserRole; unitNumber?: string }) {
  if (!supabase) {
    return null
  }

  let query = supabase
    .from('incidents')
    .select(
      'id, unit_number, title, description, category, priority, created_at, created_by_user_id, status, acknowledged_at, resolved_at, support_score, votes, guard_actions',
    )
    .order('created_at', { ascending: false })

  query = applyUnitScope(query, input.role, input.unitNumber)
  const { data, error } = await query

  if (error || !data) {
    return null
  }

  return data.map((row) => mapIncidentRow(row as IncidentRow))
}

export async function registerPackageInSupabase(pkg: Package) {
  if (!supabase) {
    return false
  }
  const { error } = await supabase.from('packages').insert(mapPackageToRow(pkg))
  return !error
}

export async function markPackageReadyInSupabase(packageId: string) {
  if (!supabase) {
    return false
  }
  const { data, error } = await supabase.rpc('packages_mark_ready', {
    p_package_id: packageId,
  })
  if (error) {
    return false
  }
  const rows = data as RpcPackageTransitionRow[] | null
  return Boolean(rows && rows.length > 0 && rows[0]?.id)
}

export async function deliverPackageInSupabase(packageId: string) {
  if (!supabase) {
    return false
  }
  const { data, error } = await supabase.rpc('packages_deliver', {
    p_package_id: packageId,
  })
  if (error) {
    return false
  }
  const rows = data as RpcPackageTransitionRow[] | null
  return Boolean(rows && rows.length > 0 && rows[0]?.id)
}

export async function createIncidentInSupabase(incident: Incident) {
  if (!supabase) {
    return false
  }
  const { error } = await supabase.from('incidents').insert(mapIncidentToRow(incident))
  return !error
}

export async function voteIncidentInSupabase(input: { incidentId: string; newValue: 1 | -1 }) {
  if (!supabase) {
    return false
  }
  const { data, error } = await supabase.rpc('incidents_vote', {
    p_incident_id: input.incidentId,
    p_value: input.newValue,
  })
  if (error) {
    return false
  }
  const rows = data as { id: string }[] | null
  return Boolean(rows && rows.length > 0)
}

export async function updateIncidentInSupabase(incident: Incident) {
  if (!supabase) {
    return false
  }
  const { error } = await supabase
    .from('incidents')
    .update({
      status: incident.status,
      acknowledged_at: incident.acknowledgedAt ?? null,
      resolved_at: incident.resolvedAt ?? null,
      support_score: incident.supportScore,
      votes: incident.votes,
      guard_actions: incident.guardActions,
    })
    .eq('id', incident.id)
  return !error
}

export async function uploadPackagePhoto(file: Blob) {
  if (!supabase) {
    throw new Error('Supabase no esta configurado.')
  }

  const path = `packages/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.webp`
  const bucket = supabase.storage.from(PACKAGE_BUCKET)

  const signedUpload = await bucket.createSignedUploadUrl(path)
  if (!signedUpload.error && signedUpload.data?.token) {
    const uploadResult = await bucket.uploadToSignedUrl(path, signedUpload.data.token, file, {
      contentType: 'image/webp',
      upsert: false,
    })
    if (uploadResult.error) {
      throw uploadResult.error
    }
  } else {
    const directUpload = await bucket.upload(path, file, {
      contentType: 'image/webp',
      upsert: false,
    })
    if (directUpload.error) {
      throw directUpload.error
    }
  }

  return path
}

function isDirectDisplayUrl(value: string) {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  )
}

export function isStorageObjectPath(value: string) {
  return Boolean(value) && !isDirectDisplayUrl(value)
}

export async function getSignedPackagePhotoUrl(path: string) {
  if (!path) {
    return null
  }
  if (isDirectDisplayUrl(path)) {
    return path
  }
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.storage
    .from(PACKAGE_BUCKET)
    .createSignedUrl(path, PACKAGE_PHOTO_SIGNED_URL_SECONDS)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}
