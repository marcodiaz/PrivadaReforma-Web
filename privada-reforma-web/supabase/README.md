# Supabase Schema and RLS

This folder contains SQL migrations for the backend MVP tables used by the FE.

## Migrations

1. `migrations/20260216130000_create_core_tables.sql`
2. `migrations/20260216131000_enable_rls_and_policies.sql`
3. `migrations/20260216133000_storage_private_package_photos.sql`
4. `migrations/20260216160000_packages_incidents_action_rpc.sql`

## Included Tables

- `public.profiles`
- `public.packages`
- `public.incidents`
- `public.qr_passes` (minimal stub)
- `public.audit_log` (minimal stub)

## Role Rules Implemented

- `resident` / `tenant`
  - Read/write only rows where `unit_number = profiles.unit_number`
  - For `packages`: can only transition `stored -> ready_for_pickup` for their own unit.
- `guard`
  - `packages` only:
    - read all rows
    - insert new package rows
    - update delivery status only (`ready_for_pickup -> delivered`)
- `board_member`
  - read-only across all units
- `admin`
  - full access on all tables

## Notes

- Package update restrictions are enforced with both RLS and trigger logic (`enforce_package_update_rules`) to prevent unauthorized column changes.
- `profiles.user_id` references `auth.users(id)` with `on delete cascade`.
- `incidents.votes` and `incidents.guard_actions` are stored as `jsonb` arrays for MVP compatibility with FE.

## Private Storage Bucket

- Bucket name: `package-photos`
- Bucket visibility: private (`public = false`)
- `packages.photo_url` stores the storage object path (example: `packages/2026/<uuid>.webp`), not a public URL.

### Storage Policies

- Upload (`insert` on `storage.objects`): only `guard` and `admin` in bucket `package-photos`.
- Read (`select` on `storage.objects`):
  - `admin`, `guard`, `board_member`: all package photos.
  - `resident`, `tenant`: only objects linked to `public.packages` rows for their own `unit_number`.
- Delete (`delete` on `storage.objects`): `admin` only.

### Frontend Access Pattern

- Do not use `getPublicUrl()` for package photos.
- Upload stores object path in DB.
- UI requests short-lived signed URLs (`createSignedUrl`, 15 minutes) at render time.
- Offline fallback can show local `data:` photos or placeholder when signed URL is unavailable.

## Action RPCs

- `packages_mark_ready(p_package_id text)`
  - Only transitions `stored -> ready_for_pickup`.
- `packages_deliver(p_package_id text)`
  - Only transitions `ready_for_pickup -> delivered`.
- `incidents_vote(p_incident_id text, p_value integer)`
  - Handles vote add/remove/toggle and recalculates `support_score`.

These are used by the FE per-action writes to avoid full-array upsert clobbering across devices.
