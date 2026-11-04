-- The Art of Nature – database schema
-- Run once in Supabase → SQL Editor. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
--
-- SECURITY MODEL
--  * Every table has Row Level Security ON and NO policies for anon/authenticated:
--    the browser can never read or write the database directly.
--  * All access goes through the Next.js server using the SECRET key (service role).
--  * Passwords are handled by Supabase Auth (bcrypt), never by our tables.

create extension if not exists pgcrypto;

-- ───────────────────────── Settings (single row) ─────────────────────────
create table if not exists public.settings (
  id int primary key check (id = 1),
  shipping_pence int not null default 399 check (shipping_pence between 0 and 5000),
  free_over_pence int not null default 4000 check (free_over_pence between 0 and 100000),
  schedule jsonb not null default '{}'::jsonb,
  manual_pause boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ───────────────────────── Products ─────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  category text not null check (category in ('candles','skincare','gifts')),
  name_en text not null, name_ro text not null,
  note_en text not null default '', note_ro text not null default '',
  desc_en text not null, desc_ro text not null,
  format_en text not null default '', format_ro text not null default '',
  price_pence int not null check (price_pence between 50 and 100000),
  stock int not null default 0 check (stock >= 0),
  active boolean not null default true,
  tag text not null default '' check (tag in ('','best_seller','popular','new','gift_set')),
  art_kind text not null default 'candle' check (art_kind in ('candle','tin','balm','tube','cream','set')),
  art_color text not null default '#C9993A' check (art_color ~ '^#[0-9A-Fa-f]{6}$'),
  art_wax text not null default '#EBCB7D' check (art_wax ~ '^#[0-9A-Fa-f]{6}$'),
  sort int not null default 100,
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 8),
  colors jsonb not null default '[]'::jsonb check (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) <= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Customer profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  address_line1 text not null default '',
  address_line2 text not null default '',
  address_city text not null default '',
  address_postcode text not null default '',
  -- Bumped on password change / sign-out-everywhere: invalidates all older session cookies.
  session_version int not null default 1,
  terms_version text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, terms_version)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'first_name', ''), 60),
          left(coalesce(new.raw_user_meta_data->>'terms_version', ''), 20))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Orders ─────────────────────────
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint unique,                         -- assigned when payment is confirmed
  status text not null default 'pending'
    check (status in ('pending','paid','packed','dispatched','delivered','refunded','cancelled')),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text not null default '',
  locale text not null default 'en' check (locale in ('en','ro')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  subtotal_pence int not null check (subtotal_pence >= 0),
  shipping_pence int not null check (shipping_pence >= 0),
  total_pence int not null check (total_pence >= 0),
  ship_name text not null default '',
  ship_line1 text not null default '', ship_line2 text not null default '',
  ship_city text not null default '', ship_postcode text not null default '',
  dispatch_by date,                             -- promised dispatch date (latest)
  tracking text,
  tracking_emailed_at timestamptz,
  needs_attention boolean not null default false,
  attention_note text not null default '',
  paid_at timestamptz,
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_email_idx on public.orders (lower(email));
create index if not exists orders_dispatch_idx on public.orders (dispatch_by) where status in ('paid','packed');

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  slug text not null,
  name_en text not null, name_ro text not null,
  unit_pence int not null check (unit_pence >= 0),
  qty int not null check (qty between 1 and 20),
  color_en text not null default '',
  color_ro text not null default ''
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ───────────────────────── Messages, newsletter, GDPR requests ─────────────────────────
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null,
  topic text not null check (topic in ('order','product','gift','privacy','other')),
  message text not null,
  locale text not null default 'en',
  replied boolean not null default false,
  ip_hash text,
  consent_version text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  locale text not null default 'en',
  status text not null default 'pending' check (status in ('pending','confirmed','unsubscribed')),
  consent_version text not null default '',
  consent_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  ip_hash text
);

create table if not exists public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  kind text not null check (kind in ('export','delete','other')),
  note text not null default '',
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '30 days'),   -- UK GDPR: one month
  done_at timestamptz
);

-- ───────────────────────── Security plumbing ─────────────────────────
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);

create table if not exists public.admin_state (
  id int primary key check (id = 1),
  last_totp_step bigint not null default 0   -- blocks re-use of a one-time code
);
insert into public.admin_state (id) values (1) on conflict (id) do nothing;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  detail jsonb not null default '{}'::jsonb
);

-- ───────────────────────── Row Level Security: deny by default ─────────────────────────
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.data_requests enable row level security;
alter table public.stripe_events enable row level security;
alter table public.rate_limits enable row level security;
alter table public.admin_state enable row level security;
alter table public.audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- ───────────────────────── Functions (service role only) ─────────────────────────

-- Fixed-window rate limiter. Returns true while the caller is within the limit.
create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;

-- Housekeeping, called opportunistically by the app.
create or replace function public.purge_old_rows() returns void
language sql security definer set search_path = public as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.stripe_events where created_at < now() - interval '90 days';
  delete from public.orders where status = 'pending' and created_at < now() - interval '3 days';
  delete from public.contact_messages where created_at < now() - interval '2 years';
  delete from public.audit_log where at < now() - interval '90 days';
$$;

-- Atomically turns a pending order into a paid one when Stripe confirms payment.
-- Idempotent: the Stripe event id is recorded in the same transaction, so a retry after
-- a crash re-runs everything, and a duplicate delivery does nothing.
create or replace function public.fulfil_order(
  p_event_id text, p_event_type text, p_order_id uuid, p_session_id text, p_payment_intent text,
  p_email text, p_ship_name text, p_line1 text, p_line2 text, p_city text, p_postcode text,
  p_dispatch_by date
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_stock int;
  v_flag boolean := false;
  v_note text := '';
begin
  insert into public.stripe_events (id, type) values (p_event_id, p_event_type)
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    -- Paid but we have no pending order (should never happen): keep a record to refund by hand.
    insert into public.orders (status, email, name, stripe_session_id, stripe_payment_intent,
      subtotal_pence, shipping_pence, total_pence, needs_attention, attention_note, paid_at)
    values ('paid', p_email, p_ship_name, p_session_id, p_payment_intent, 0, 0, 0, true,
      'Payment received but the pending order was not found. Check Stripe.', now())
    returning * into v_order;
    update public.orders set number = nextval('public.order_number_seq') where id = v_order.id;
    return jsonb_build_object('status', 'orphan', 'order_id', v_order.id);
  end if;

  if v_order.status <> 'pending' then
    return jsonb_build_object('status', 'already', 'order_id', v_order.id);
  end if;

  for v_item in select * from public.order_items where order_id = v_order.id loop
    if v_item.product_id is not null then
      select stock into v_stock from public.products where id = v_item.product_id for update;
      if v_stock is null or v_stock < v_item.qty then
        v_flag := true;
        v_note := v_note || format('Not enough stock for %s (wanted %s, had %s). ', v_item.slug, v_item.qty, coalesce(v_stock, 0));
      end if;
      update public.products set stock = greatest(stock - v_item.qty, 0), updated_at = now()
      where id = v_item.product_id;
    end if;
  end loop;

  update public.orders set
    status = 'paid',
    number = nextval('public.order_number_seq'),
    stripe_session_id = p_session_id,
    stripe_payment_intent = p_payment_intent,
    email = coalesce(nullif(p_email, ''), email),
    ship_name = p_ship_name, name = coalesce(nullif(p_ship_name, ''), name),
    ship_line1 = p_line1, ship_line2 = p_line2, ship_city = p_city, ship_postcode = p_postcode,
    dispatch_by = p_dispatch_by,
    needs_attention = v_flag, attention_note = trim(v_note),
    paid_at = now(), updated_at = now()
  where id = v_order.id
  returning * into v_order;

  return jsonb_build_object('status', 'paid', 'order_id', v_order.id, 'number', v_order.number, 'flag', v_flag);
end $$;

-- Marks an abandoned Stripe session. Idempotent.
create or replace function public.expire_order(p_order_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.orders set status = 'cancelled', updated_at = now()
  where id = p_order_id and status = 'pending';
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
revoke all on function public.purge_old_rows() from public;
revoke all on function public.fulfil_order(text, text, uuid, text, text, text, text, text, text, text, text, date) from public;
revoke all on function public.expire_order(uuid) from public;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
grant execute on function public.purge_old_rows() to service_role;
grant execute on function public.fulfil_order(text, text, uuid, text, text, text, text, text, text, text, text, date) to service_role;
grant execute on function public.expire_order(uuid) to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;


-- Public bucket for product photos. Only the server (secret key) can upload: no policies for anon/authenticated.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
