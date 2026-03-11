create table if not exists public.reservations (
  id text primary key,
  unit_number text not null,
  amenity text not null,
  reservation_date date not null,
  fee integer not null check (fee >= 0),
  status text not null check (status in ('pending_payment', 'active', 'cancelled')),
  payment_required boolean not null default true,
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'requires_action', 'paid', 'failed', 'canceled', 'refunded')
  ),
  payment_charge_id text null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid not null references public.profiles(user_id)
);

create index if not exists reservations_unit_idx on public.reservations(unit_number);
create index if not exists reservations_date_idx on public.reservations(reservation_date desc);
create index if not exists reservations_status_idx on public.reservations(status);
create unique index if not exists reservations_amenity_date_open_idx
  on public.reservations (amenity, reservation_date)
  where status in ('pending_payment', 'active');

create table if not exists public.payment_charges (
  id text primary key,
  reservation_id text null references public.reservations(id) on delete set null,
  unit_number text not null,
  charge_type text not null check (charge_type in ('reservation_fee')),
  amount_mxn integer not null check (amount_mxn > 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  status text not null default 'pending' check (
    status in ('pending', 'requires_action', 'paid', 'failed', 'canceled', 'refunded')
  ),
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_checkout_session_id text null,
  provider_payment_intent_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_charges_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists payment_charges_unit_idx on public.payment_charges(unit_number);
create index if not exists payment_charges_status_idx on public.payment_charges(status);
create index if not exists payment_charges_reservation_idx on public.payment_charges(reservation_id);
create unique index if not exists payment_charges_checkout_session_uidx
  on public.payment_charges(provider_checkout_session_id)
  where provider_checkout_session_id is not null;

alter table public.reservations
  add constraint reservations_payment_charge_fk
  foreign key (payment_charge_id) references public.payment_charges(id)
  on delete set null;

create table if not exists public.payment_attempts (
  id text primary key,
  charge_id text not null references public.payment_charges(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_checkout_session_id text null,
  status text not null default 'pending' check (
    status in ('pending', 'requires_action', 'paid', 'failed', 'canceled', 'refunded')
  ),
  idempotency_key text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payment_attempts_request_payload_is_object check (jsonb_typeof(request_payload) = 'object'),
  constraint payment_attempts_response_payload_is_object check (jsonb_typeof(response_payload) = 'object')
);

create unique index if not exists payment_attempts_idempotency_uidx on public.payment_attempts(idempotency_key);
create unique index if not exists payment_attempts_checkout_session_uidx
  on public.payment_attempts(provider_checkout_session_id)
  where provider_checkout_session_id is not null;
create index if not exists payment_attempts_charge_idx on public.payment_attempts(charge_id);

create table if not exists public.payment_ledger_entries (
  id text primary key,
  charge_id text not null references public.payment_charges(id) on delete cascade,
  event_type text not null,
  previous_status text null check (
    previous_status in ('pending', 'requires_action', 'paid', 'failed', 'canceled', 'refunded')
  ),
  new_status text not null check (
    new_status in ('pending', 'requires_action', 'paid', 'failed', 'canceled', 'refunded')
  ),
  amount_mxn integer null check (amount_mxn is null or amount_mxn >= 0),
  currency text null check (currency is null or currency = 'MXN'),
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payment_ledger_entries_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists payment_ledger_charge_idx on public.payment_ledger_entries(charge_id);
create index if not exists payment_ledger_created_at_idx on public.payment_ledger_entries(created_at desc);

create table if not exists public.payment_webhook_events (
  id text primary key,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  constraint payment_webhook_events_payload_is_object check (jsonb_typeof(payload) = 'object')
);

create or replace function public.set_payment_charges_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_charges_set_updated_at on public.payment_charges;
create trigger trg_payment_charges_set_updated_at
before update on public.payment_charges
for each row
execute function public.set_payment_charges_updated_at();

create or replace function public.prevent_mutating_payment_history()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Payment history tables are append-only.';
end;
$$;

drop trigger if exists trg_payment_attempts_no_update on public.payment_attempts;
create trigger trg_payment_attempts_no_update
before update or delete on public.payment_attempts
for each row
execute function public.prevent_mutating_payment_history();

drop trigger if exists trg_payment_ledger_no_update on public.payment_ledger_entries;
create trigger trg_payment_ledger_no_update
before update or delete on public.payment_ledger_entries
for each row
execute function public.prevent_mutating_payment_history();

drop trigger if exists trg_payment_webhook_no_update on public.payment_webhook_events;
create trigger trg_payment_webhook_no_update
before update or delete on public.payment_webhook_events
for each row
execute function public.prevent_mutating_payment_history();

alter table public.reservations enable row level security;
alter table public.payment_charges enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_ledger_entries enable row level security;
alter table public.payment_webhook_events enable row level security;

drop policy if exists reservations_select_by_role on public.reservations;
create policy reservations_select_by_role
on public.reservations
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and unit_number = public.current_user_unit_number()
  )
);

drop policy if exists reservations_insert_by_role on public.reservations;
create policy reservations_insert_by_role
on public.reservations
for insert
to authenticated
with check (
  public.current_user_role() in ('admin')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and unit_number = public.current_user_unit_number()
    and created_by_user_id = auth.uid()
  )
);

drop policy if exists reservations_update_admin_only on public.reservations;
create policy reservations_update_admin_only
on public.reservations
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists payment_charges_select_by_role on public.payment_charges;
create policy payment_charges_select_by_role
on public.payment_charges
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and unit_number = public.current_user_unit_number()
  )
);

drop policy if exists payment_attempts_select_by_role on public.payment_attempts;
create policy payment_attempts_select_by_role
on public.payment_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.payment_charges c
    where c.id = payment_attempts.charge_id
      and (
        public.current_user_role() in ('admin', 'board_member')
        or (
          public.current_user_role() in ('resident', 'tenant')
          and c.unit_number = public.current_user_unit_number()
        )
      )
  )
);

drop policy if exists payment_ledger_select_by_role on public.payment_ledger_entries;
create policy payment_ledger_select_by_role
on public.payment_ledger_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.payment_charges c
    where c.id = payment_ledger_entries.charge_id
      and (
        public.current_user_role() in ('admin', 'board_member')
        or (
          public.current_user_role() in ('resident', 'tenant')
          and c.unit_number = public.current_user_unit_number()
        )
      )
  )
);

drop policy if exists payment_webhook_events_select_admin on public.payment_webhook_events;
create policy payment_webhook_events_select_admin
on public.payment_webhook_events
for select
to authenticated
using (public.current_user_role() = 'admin');

create or replace function public.has_unpaid_reservation_debt(p_unit_number text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.payment_charges c
    where c.unit_number = p_unit_number
      and c.charge_type = 'reservation_fee'
      and c.status in ('pending', 'requires_action', 'failed')
  );
$$;

grant execute on function public.has_unpaid_reservation_debt(text) to authenticated;
