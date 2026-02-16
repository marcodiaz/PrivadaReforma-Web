-- Core schema for Supabase (Postgres)
-- Tables: profiles, packages, incidents, qr_passes, audit_log

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'resident', 'tenant', 'guard', 'board_member', 'maintenance')),
  unit_number text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_unit_required_for_residents
    check (
      (role in ('resident', 'tenant') and unit_number is not null)
      or (role not in ('resident', 'tenant'))
    )
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_unit_number_idx on public.profiles(unit_number);

create table if not exists public.packages (
  id text primary key,
  unit_number text not null,
  photo_url text not null,
  carrier text null,
  notes text null,
  status text not null check (status in ('stored', 'ready_for_pickup', 'delivered')),
  created_at timestamptz not null default now(),
  stored_by_guard_user_id uuid not null references public.profiles(user_id),
  ready_at timestamptz null,
  ready_by_user_id uuid null references public.profiles(user_id),
  delivered_at timestamptz null,
  delivered_by_guard_user_id uuid null references public.profiles(user_id)
);

create index if not exists packages_unit_number_idx on public.packages(unit_number);
create index if not exists packages_status_idx on public.packages(status);
create index if not exists packages_created_at_idx on public.packages(created_at desc);

create table if not exists public.incidents (
  id text primary key,
  unit_number text not null,
  title text not null,
  description text not null,
  category text not null check (category in ('noise', 'pets', 'rules', 'other')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null check (status in ('open', 'acknowledged', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id),
  acknowledged_at timestamptz null,
  resolved_at timestamptz null,
  support_score integer not null default 0,
  votes jsonb not null default '[]'::jsonb,
  guard_actions jsonb not null default '[]'::jsonb,
  constraint incidents_votes_is_array check (jsonb_typeof(votes) = 'array'),
  constraint incidents_guard_actions_is_array check (jsonb_typeof(guard_actions) = 'array')
);

create index if not exists incidents_unit_number_idx on public.incidents(unit_number);
create index if not exists incidents_status_idx on public.incidents(status);
create index if not exists incidents_created_at_idx on public.incidents(created_at desc);

create table if not exists public.qr_passes (
  id text primary key,
  unit_number text not null,
  created_by_user_id uuid not null references public.profiles(user_id),
  label text not null default '',
  type text not null check (type in ('single_use', 'time_window')),
  status text not null check (status in ('active', 'used', 'expired', 'revoked')),
  qr_value text not null,
  display_code text not null,
  start_at timestamptz null,
  end_at timestamptz null,
  visitor_photo_url text null,
  created_at timestamptz not null default now()
);

create index if not exists qr_passes_unit_number_idx on public.qr_passes(unit_number);
create index if not exists qr_passes_status_idx on public.qr_passes(status);
create index if not exists qr_passes_created_at_idx on public.qr_passes(created_at desc);

create table if not exists public.audit_log (
  id text primary key,
  unit_number text null,
  actor_user_id uuid not null references public.profiles(user_id),
  action text not null,
  target_table text null,
  target_id text null,
  result text null,
  note text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_log_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists audit_log_unit_number_idx on public.audit_log(unit_number);
create index if not exists audit_log_actor_idx on public.audit_log(actor_user_id);
create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);
