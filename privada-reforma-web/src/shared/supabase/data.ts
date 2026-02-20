import type { UserRole } from '../domain/auth'
import type { Incident, PetPost, Poll } from '../domain/demoData'
import type { Package } from '../domain/packages'
import { supabase } from './client'

const PACKAGE_BUCKET = 'package-photos'
const PACKAGE_PHOTO_SIGNED_URL_SECONDS = 15 * 60
const PET_BUCKET = 'pet-photos'
const PET_PHOTO_SIGNED_URL_SECONDS = 15 * 60

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

type PollOptionRow = {
  id: string
  label: string
}

type PollVoteRow = {
  userId: string
  userName: string
  optionId: string
  votedAt: string
}

type PollRow = {
  id: string
  title: string
  options: PollOptionRow[]
  votes: PollVoteRow[]
  created_at: string
  ends_at: string | null
  ended_at: string | null
  created_by_user_id: string
  created_by_name: string
}

type PetPostRow = {
  id: string
  pet_name: string
  photo_url: string
  comments: string
  created_at: string
  created_by_user_id: string
  created_by_name: string
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

function mapPollRow(row: PollRow): Poll {
  return {
    id: row.id,
    title: row.title,
    options: row.options ?? [],
    votes: row.votes ?? [],
    createdAt: row.created_at,
    endsAt: row.ends_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
  }
}

function mapPetPostRow(row: PetPostRow): PetPost {
  return {
    id: row.id,
    petName: row.pet_name,
    photoUrl: row.photo_url,
    comments: row.comments,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
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

function mapPollToRow(input: Poll): PollRow {
  return {
    id: input.id,
    title: input.title,
    options: input.options,
    votes: input.votes,
    created_at: input.createdAt,
    ends_at: input.endsAt ?? null,
    ended_at: input.endedAt ?? null,
    created_by_user_id: input.createdByUserId,
    created_by_name: input.createdByName,
  }
}

function mapPetPostToRow(input: PetPost): PetPostRow {
  return {
    id: input.id,
    pet_name: input.petName,
    photo_url: input.photoUrl,
    comments: input.comments,
    created_at: input.createdAt,
    created_by_user_id: input.createdByUserId,
    created_by_name: input.createdByName,
  }
}

function applyUnitScope<T extends { eq: (...args: [string, string]) => T }>(
  query: T,
  role: UserRole,
  unitNumber?: string
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
      'id, unit_number, photo_url, carrier, notes, status, created_at, stored_by_guard_user_id, ready_at, delivered_at, delivered_by_guard_user_id, ready_by_user_id'
    )
    .order('created_at', { ascending: false })

  query = applyUnitScope(query, input.role, input.unitNumber)
  const { data, error } = await query

  if (error || !data) {
    return null
  }

  return data.map((row) => mapPackageRow(row as PackageRow))
}

export async function fetchIncidentsFromSupabase(_input: { role: UserRole; unitNumber?: string }) {
  if (!supabase) {
    return null
  }

  const query = supabase
    .from('incidents')
    .select(
      'id, unit_number, title, description, category, priority, created_at, created_by_user_id, status, acknowledged_at, resolved_at, support_score, votes, guard_actions'
    )
    .order('created_at', { ascending: false })
  const { data, error } = await query

  if (error || !data) {
    return null
  }

  return data.map((row) => mapIncidentRow(row as IncidentRow))
}

export async function fetchPollsFromSupabase() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('polls')
    .select('id, title, options, votes, created_at, ends_at, ended_at, created_by_user_id, created_by_name')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return null
  }

  return data.map((row) => mapPollRow(row as PollRow))
}

export async function createPollInSupabase(poll: Poll) {
  if (!supabase) {
    return false
  }
  const { error } = await supabase.from('polls').insert(mapPollToRow(poll))
  return !error
}

export async function votePollInSupabase(input: { pollId: string; optionId: string }) {
  if (!supabase) {
    return false
  }
  const { data, error } = await supabase.rpc('polls_vote', {
    p_poll_id: input.pollId,
    p_option_id: input.optionId,
  })
  if (error) {
    return false
  }
  const rows = data as { id: string }[] | null
  return Boolean(rows && rows.length > 0)
}

export async function deletePollInSupabase(pollId: string) {
  if (!supabase) {
    return false
  }
  const { error } = await supabase.from('polls').delete().eq('id', pollId)
  return !error
}

export async function endPollInSupabase(input: { pollId: string; endedAt: string }) {
  if (!supabase) {
    return false
  }
  const { error } = await supabase
    .from('polls')
    .update({ ended_at: input.endedAt })
    .eq('id', input.pollId)
  return !error
}

export async function fetchPetPostsFromSupabase() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('pet_posts')
    .select('id, pet_name, photo_url, comments, created_at, created_by_user_id, created_by_name')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return null
  }

  return data.map((row) => mapPetPostRow(row as PetPostRow))
}

export async function createPetPostInSupabase(petPost: PetPost) {
  if (!supabase) {
    return false
  }
  const { error } = await supabase.from('pet_posts').insert(mapPetPostToRow(petPost))
  return !error
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

export async function uploadPetPhoto(file: Blob) {
  if (!supabase) {
    throw new Error('Supabase no esta configurado.')
  }

  const path = `pets/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.webp`
  const bucket = supabase.storage.from(PET_BUCKET)

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

export async function getSignedPackagePhotoUrl(
  path: string,
  expiresSeconds = PACKAGE_PHOTO_SIGNED_URL_SECONDS
): Promise<string> {
  if (!path) {
    throw new Error('Storage path requerido.')
  }
  if (isDirectDisplayUrl(path)) {
    return path
  }
  if (!supabase) {
    throw new Error('Supabase no esta configurado.')
  }

  const { data, error } = await supabase.storage
    .from(PACKAGE_BUCKET)
    .createSignedUrl(path, expiresSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'No fue posible crear signed URL.')
  }

  return data.signedUrl
}

export async function getSignedPetPhotoUrl(
  path: string,
  expiresSeconds = PET_PHOTO_SIGNED_URL_SECONDS
): Promise<string> {
  if (!path) {
    throw new Error('Storage path requerido.')
  }
  if (isDirectDisplayUrl(path)) {
    return path
  }
  if (!supabase) {
    throw new Error('Supabase no esta configurado.')
  }

  const { data, error } = await supabase.storage.from(PET_BUCKET).createSignedUrl(path, expiresSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'No fue posible crear signed URL.')
  }

  return data.signedUrl
}
