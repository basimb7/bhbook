-- =====================================================================
-- BH Booking — initial schema
-- Run in Supabase SQL editor (or `supabase db push`).
--
-- Model: a booking occupies NIGHTS. stay = [check_in, check_out)
--   check-in 14:00 on check_in, check-out 11:00 on check_out.
--   So a guest may check in on the same day another guest checks out.
-- Double-booking is prevented in the database by an EXCLUSION
-- constraint on (property_id, stay) for "blocking" statuses.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------- Enums ----------------------------------------------------
do $$ begin
  create type booking_status as enum (
    'enquiry',    -- customer submitted, awaiting admin
    'confirmed',  -- admin confirmed (advance received) -> dates locked
    'completed',  -- stay done / booking closed
    'cancelled',  -- cancelled after confirmation
    'rejected',   -- enquiry declined
    'blocked'     -- admin manually blocked dates (maintenance, personal use)
  );
exception when duplicate_object then null; end $$;

-- ---------- Properties (multi-property ready) -----------------------
create table if not exists public.properties (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  description    text,
  address        text,
  check_in_time  time not null default '14:00',
  check_out_time time not null default '11:00',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------- Admin profiles (linked to Supabase Auth users) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  full_name  text,
  role       text not null default 'admin' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- ---------- Bookings -------------------------------------------------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique
                   default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  property_id    uuid not null references public.properties(id) on delete restrict,
  check_in       date not null,
  check_out      date not null,
  stay           daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  status         booking_status not null default 'enquiry',
  full_name      text not null check (char_length(full_name) between 2 and 120),
  phone_1        text not null check (char_length(phone_1) between 6 and 20),
  phone_2        text check (phone_2 is null or char_length(phone_2) between 6 and 20),
  guest_message  text check (guest_message is null or char_length(guest_message) <= 1000),
  total_amount   numeric(12,2) check (total_amount is null or total_amount >= 0),
  admin_notes    text,
  confirmed_at   timestamptz,
  closed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint bookings_dates_valid check (check_out > check_in),
  -- THE double-booking guard: no two locking bookings may overlap on the same property.
  constraint bookings_no_overlap exclude using gist (
    property_id with =,
    stay with &&
  ) where (status in ('confirmed', 'completed', 'blocked'))
);

create index if not exists bookings_property_status_idx on public.bookings (property_id, status);
create index if not exists bookings_stay_idx on public.bookings using gist (stay);

-- ---------- Payments (recorded manually; money moves outside platform)
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null default 'bank_transfer'
                check (method in ('cash', 'bank_transfer', 'upi', 'card', 'other')),
  kind        text not null default 'advance'
                check (kind in ('advance', 'balance', 'refund', 'other')),
  reference   text,
  paid_on     date not null default current_date,
  notes       text,
  recorded_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index if not exists payments_booking_idx on public.payments (booking_id);

-- ---------- Status history (audit trail) ----------------------------
create table if not exists public.booking_events (
  id          bigint generated always as identity primary key,
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  from_status booking_status,
  to_status   booking_status not null,
  actor       uuid references auth.users(id),
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists booking_events_booking_idx on public.booking_events (booking_id);

-- ---------- Triggers -------------------------------------------------
create or replace function public.tg_bookings_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  end if;
  if new.status in ('completed', 'cancelled', 'rejected') and old.status is distinct from new.status then
    new.closed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.tg_bookings_touch();

create or replace function public.tg_bookings_log_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into booking_events (booking_id, from_status, to_status, actor)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into booking_events (booking_id, from_status, to_status, actor)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists bookings_log_status on public.bookings;
create trigger bookings_log_status after insert or update on public.bookings
  for each row execute function public.tg_bookings_log_status();

-- ---------- Helpers --------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'staff'));
$$;

-- Public availability: returns ONLY date ranges, never guest details.
create or replace function public.get_unavailable_ranges(
  p_property_id uuid, p_from date, p_to date
)
returns table (check_in date, check_out date)
language sql stable security definer set search_path = public as $$
  select b.check_in, b.check_out
  from bookings b
  where b.property_id = p_property_id
    and b.status in ('confirmed', 'completed', 'blocked')
    and b.stay && daterange(p_from, p_to, '[)')
  order by b.check_in;
$$;

-- Public enquiry creation with validation. Returns the booking reference.
create or replace function public.create_enquiry(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_full_name text,
  p_phone_1 text,
  p_phone_2 text default null,
  p_message text default null
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_ref text;
begin
  if p_check_in < current_date then
    raise exception 'Check-in date cannot be in the past' using errcode = '22023';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in' using errcode = '22023';
  end if;
  if p_check_out - p_check_in > 30 then
    raise exception 'Maximum stay is 30 nights' using errcode = '22023';
  end if;
  if not exists (select 1 from properties where id = p_property_id and is_active) then
    raise exception 'Property not found' using errcode = '22023';
  end if;
  if exists (
    select 1 from bookings
    where property_id = p_property_id
      and status in ('confirmed', 'completed', 'blocked')
      and stay && daterange(p_check_in, p_check_out, '[)')
  ) then
    raise exception 'Selected dates are not available' using errcode = '23P01';
  end if;

  insert into bookings (property_id, check_in, check_out, full_name, phone_1, phone_2, guest_message)
  values (
    p_property_id, p_check_in, p_check_out,
    trim(p_full_name), trim(p_phone_1),
    nullif(trim(coalesce(p_phone_2, '')), ''),
    nullif(trim(coalesce(p_message, '')), '')
  )
  returning reference into v_ref;

  return v_ref;
end $$;

-- Login helper: map username -> email. Only callable with the service role
-- (server-side), so usernames/emails are never exposed to the browser.
create or replace function public.email_for_username(p_username text)
returns text language sql stable security definer set search_path = public, auth as $$
  select u.email from profiles p join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username) limit 1;
$$;

revoke all on function public.email_for_username(text) from public, anon, authenticated;
grant execute on function public.email_for_username(text) to service_role;

grant execute on function public.get_unavailable_ranges(uuid, date, date) to anon, authenticated;
grant execute on function public.create_enquiry(uuid, date, date, text, text, text, text) to anon, authenticated;

-- ---------- Row Level Security --------------------------------------
alter table public.properties     enable row level security;
alter table public.profiles       enable row level security;
alter table public.bookings       enable row level security;
alter table public.payments       enable row level security;
alter table public.booking_events enable row level security;

-- Properties: anyone may read active properties; admins manage.
drop policy if exists properties_public_read on public.properties;
create policy properties_public_read on public.properties
  for select using (is_active or public.is_admin());
drop policy if exists properties_admin_write on public.properties;
create policy properties_admin_write on public.properties
  for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: a user sees their own; admins see all.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Bookings / payments / events: admin only. (Public goes through the RPCs above.)
drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists booking_events_admin_read on public.booking_events;
create policy booking_events_admin_read on public.booking_events
  for select using (public.is_admin());
