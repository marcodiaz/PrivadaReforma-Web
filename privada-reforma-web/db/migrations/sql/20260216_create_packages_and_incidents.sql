-- Sample schema for Supabase/Postgres.
-- Adjust role checks to your auth model (custom claims, profiles table, etc).

create extension if not exists "pgcrypto";

create table if not exists public.packages (
  id text primary key,
  unit_number text not null,
  photo_url text not null,
  carrier text,
  notes text,
  status text not null check (status in ('stored', 'ready_for_pickup', 'delivered')),
  created_at timestamptz not null default now(),
  stored_by_guard_user_id text not null,
  ready_at timestamptz,
  delivered_at timestamptz,
  delivered_by_guard_user_id text,
  ready_by_user_id text
);

create index if not exists packages_created_at_idx on public.packages (created_at desc);
create index if not exists packages_unit_number_idx on public.packages (unit_number);

create table if not exists public.incidents (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (category in ('noise', 'pets', 'rules', 'other')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  created_by_user_id text not null,
  status text not null check (status in ('open', 'acknowledged', 'in_progress', 'resolved')),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  support_score integer not null default 0,
  votes jsonb not null default '[]'::jsonb,
  guard_actions jsonb not null default '[]'::jsonb
);

create index if not exists incidents_created_at_idx on public.incidents (created_at desc);
create index if not exists incidents_status_idx on public.incidents (status);
