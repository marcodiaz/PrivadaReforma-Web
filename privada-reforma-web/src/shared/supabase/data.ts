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

export async function fetchPackagesFromSupabase() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('packages')
    .select(
      'id, unit_number, photo_url, carrier, notes, status, created_at, stored_by_guard_user_id, ready_at, delivered_at, delivered_by_guard_user_id, ready_by_user_id'
    )
    .order('created_at', { ascending: false })

  if (error || !data) {
    return null
  }

  return data.map((row) => mapPackageRow(row as PackageRow))
}

export async function fetchIncidentsFromSupabase() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('incidents')
    .select(
      'id, title, description, category, priority, created_at, created_by_user_id, status, acknowledged_at, resolved_at, support_score, votes, guard_actions'
    )
    .order('created_at', { ascending: false })

  if (error || !data) {
    return null
  }

  return data.map((row) => mapIncidentRow(row as IncidentRow))
}

export async function syncPackagesToSupabase(packages: Package[]) {
  if (!supabase || packages.length === 0) {
    return
  }

  const payload = packages.map(mapPackageToRow)
  await supabase.from('packages').upsert(payload, { onConflict: 'id' })
}

export async function syncIncidentsToSupabase(incidents: Incident[]) {
  if (!supabase || incidents.length === 0) {
    return
  }

  const payload = incidents.map(mapIncidentToRow)
  await supabase.from('incidents').upsert(payload, { onConflict: 'id' })
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
