create table if not exists public.financial_categories (
  id text primary key,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true
);

create table if not exists public.financial_period_closes (
  id text primary key,
  year integer not null check (year >= 2000),
  month integer not null check (month between 1 and 12),
  opening_balance_mxn numeric(12, 2) not null check (opening_balance_mxn >= 0),
  closing_balance_mxn numeric(12, 2) not null check (closing_balance_mxn >= 0),
  notes text null,
  published_at timestamptz not null default now(),
  published_by_user_id uuid not null references public.profiles(user_id),
  unique (year, month)
);

create table if not exists public.financial_movements (
  id text primary key,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  sub_category text null,
  amount_mxn numeric(12, 2) not null check (amount_mxn > 0),
  occurred_at timestamptz not null,
  period_year integer not null check (period_year >= 2000),
  period_month integer not null check (period_month between 1 and 12),
  description text not null,
  vendor_or_source text null,
  unit_number text null,
  visibility_scope text not null check (visibility_scope in ('community', 'board_only', 'unit_private')),
  evidence_url text null,
  created_by_user_id uuid not null references public.profiles(user_id)
);

create index if not exists financial_movements_period_idx on public.financial_movements(period_year desc, period_month desc);
create index if not exists financial_movements_unit_idx on public.financial_movements(unit_number);
create index if not exists financial_movements_visibility_idx on public.financial_movements(visibility_scope);

create table if not exists public.unit_account_entries (
  id text primary key,
  unit_number text not null,
  entry_type text not null check (entry_type in ('charge', 'payment', 'adjustment')),
  category text not null,
  amount_mxn numeric(12, 2) not null check (amount_mxn > 0),
  direction text not null check (direction in ('debit', 'credit')),
  occurred_at timestamptz not null,
  due_at date null,
  status text not null check (status in ('posted', 'pending', 'overdue', 'paid', 'partial')),
  reference_movement_id text null references public.financial_movements(id) on delete set null,
  notes text null,
  created_by_user_id uuid not null references public.profiles(user_id)
);

create index if not exists unit_account_entries_unit_idx on public.unit_account_entries(unit_number, occurred_at desc);
create index if not exists unit_account_entries_status_idx on public.unit_account_entries(status);

alter table public.financial_categories enable row level security;
alter table public.financial_period_closes enable row level security;
alter table public.financial_movements enable row level security;
alter table public.unit_account_entries enable row level security;

drop policy if exists financial_categories_select_authenticated on public.financial_categories;
create policy financial_categories_select_authenticated
on public.financial_categories
for select
to authenticated
using (true);

drop policy if exists financial_categories_manage_admin on public.financial_categories;
create policy financial_categories_manage_admin
on public.financial_categories
for all
to authenticated
using (public.current_user_role() in ('admin', 'board_member'))
with check (public.current_user_role() in ('admin', 'board_member'));

drop policy if exists financial_period_closes_select_authenticated on public.financial_period_closes;
create policy financial_period_closes_select_authenticated
on public.financial_period_closes
for select
to authenticated
using (public.current_user_role() in ('admin', 'board_member', 'resident', 'tenant'));

drop policy if exists financial_period_closes_manage_admin on public.financial_period_closes;
create policy financial_period_closes_manage_admin
on public.financial_period_closes
for all
to authenticated
using (public.current_user_role() in ('admin', 'board_member'))
with check (public.current_user_role() in ('admin', 'board_member'));

drop policy if exists financial_movements_select_by_visibility on public.financial_movements;
create policy financial_movements_select_by_visibility
on public.financial_movements
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and (
      visibility_scope = 'community'
      or (visibility_scope = 'unit_private' and unit_number = public.current_user_unit_number())
    )
  )
);

drop policy if exists financial_movements_manage_admin on public.financial_movements;
create policy financial_movements_manage_admin
on public.financial_movements
for all
to authenticated
using (public.current_user_role() in ('admin', 'board_member'))
with check (public.current_user_role() in ('admin', 'board_member'));

drop policy if exists unit_account_entries_select_by_role on public.unit_account_entries;
create policy unit_account_entries_select_by_role
on public.unit_account_entries
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'board_member')
  or (
    public.current_user_role() in ('resident', 'tenant')
    and unit_number = public.current_user_unit_number()
  )
);

drop policy if exists unit_account_entries_manage_admin on public.unit_account_entries;
create policy unit_account_entries_manage_admin
on public.unit_account_entries
for all
to authenticated
using (public.current_user_role() in ('admin', 'board_member'))
with check (public.current_user_role() in ('admin', 'board_member'));

insert into public.financial_categories (id, name, type, sort_order, is_active)
values
  ('cat-income-maintenance', 'Mantenimiento', 'income', 1, true),
  ('cat-income-renta-casa-club', 'Renta Casa Club', 'income', 2, true),
  ('cat-income-tarjeta-acceso', 'Tarjeta de Acceso', 'income', 3, true),
  ('cat-expense-agua', 'Agua', 'expense', 1, true),
  ('cat-expense-alberca', 'Alberca', 'expense', 2, true),
  ('cat-expense-camaras', 'Camaras', 'expense', 3, true),
  ('cat-expense-casa-club', 'Casa Club', 'expense', 4, true),
  ('cat-expense-cerrajeria', 'Cerrajeria', 'expense', 5, true),
  ('cat-expense-comisiones', 'Comisiones Bancarias', 'expense', 6, true),
  ('cat-expense-guardias', 'Guardias', 'expense', 7, true),
  ('cat-expense-jardineria', 'Jardineria', 'expense', 8, true),
  ('cat-expense-luz', 'Luz', 'expense', 9, true),
  ('cat-expense-mantenimiento-general', 'Mantenimiento general', 'expense', 10, true),
  ('cat-expense-panel-solar', 'Panel Solar', 'expense', 11, true),
  ('cat-expense-recolectora', 'Recolectora', 'expense', 12, true),
  ('cat-expense-residentia-qr', 'Residentia QR', 'expense', 13, true),
  ('cat-expense-otro', 'Otro', 'expense', 14, true)
on conflict (id) do update
set
  name = excluded.name,
  type = excluded.type,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
