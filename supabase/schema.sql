-- ============================================================
-- MULTIPLY.AI MVP — SCHEMA
-- Run this once in Supabase SQL Editor (fresh project → SQL Editor → New query)
-- ============================================================

create extension if not exists "uuid-ossp";

-- One row per distributor business using Multiply.ai
create table distributors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  wa_phone_number_id text,      -- WhatsApp Cloud API phone_number_id (from Meta)
  created_at timestamptz default now()
);

-- Distributor's team members (owner, salesmen) -- linked to Supabase Auth
create table team_users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  distributor_id uuid references distributors(id) on delete cascade,
  name text not null,
  phone text,
  role text not null default 'owner' check (role in ('owner','sales_manager','salesman')),
  created_at timestamptz default now()
);

create table retailers (
  id uuid primary key default uuid_generate_v4(),
  distributor_id uuid references distributors(id) on delete cascade,
  name text not null,
  owner_name text,
  phone text not null,          -- WhatsApp number, E.164 digits only e.g. 919922011001
  area text,
  credit_limit numeric default 0,
  outstanding numeric default 0,
  created_at timestamptz default now(),
  unique (distributor_id, phone)
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  distributor_id uuid references distributors(id) on delete cascade,
  name text not null,
  category text,
  sku text,
  mrp numeric,
  rate numeric not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  distributor_id uuid references distributors(id) on delete cascade,
  retailer_id uuid references retailers(id) on delete cascade,
  source text not null default 'whatsapp' check (source in ('whatsapp','salesman_app','phone')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  total numeric not null default 0,
  approved_by uuid references team_users(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,   -- snapshot, survives product edits/renames
  qty numeric not null,
  rate numeric not null,
  line_total numeric not null
);

-- Conversation state machine per retailer — drives the WhatsApp ordering flow
create table wa_sessions (
  retailer_id uuid primary key references retailers(id) on delete cascade,
  state text not null default 'idle',     -- idle | browsing | confirming
  cart jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- Raw message log — invaluable for debugging the webhook during setup
create table wa_messages (
  id uuid primary key default uuid_generate_v4(),
  retailer_id uuid references retailers(id) on delete set null,
  direction text not null check (direction in ('in','out')),
  body text,
  raw jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — each distributor's team only sees their own data
-- ============================================================
alter table distributors enable row level security;
alter table team_users enable row level security;
alter table retailers enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create or replace function auth_distributor_id() returns uuid as $$
  select distributor_id from team_users where auth_user_id = auth.uid() limit 1;
$$ language sql stable;

create policy "team reads own distributor" on distributors
  for select using (id = auth_distributor_id());

create policy "team reads own team" on team_users
  for select using (distributor_id = auth_distributor_id());

create policy "team manages own retailers" on retailers
  for all using (distributor_id = auth_distributor_id());

create policy "team manages own products" on products
  for all using (distributor_id = auth_distributor_id());

create policy "team manages own orders" on orders
  for all using (distributor_id = auth_distributor_id());

create policy "team manages own order items" on order_items
  for all using (order_id in (select id from orders where distributor_id = auth_distributor_id()));

-- NOTE: the WhatsApp webhook (app/api/whatsapp/webhook/route.ts) uses the
-- Supabase SERVICE ROLE key server-side, which bypasses RLS by design —
-- that's what lets an inbound WhatsApp message (no logged-in user) write rows.
-- Never expose the service role key to the browser.

-- ============================================================
-- SEED DATA — replace with your real distributor + retailers + products
-- ============================================================
insert into distributors (id, name, wa_phone_number_id) values
  ('00000000-0000-0000-0000-000000000001', 'Sharma Distributors', 'REPLACE_WITH_YOUR_WA_PHONE_NUMBER_ID');

insert into retailers (distributor_id, name, owner_name, phone, area, credit_limit) values
  ('00000000-0000-0000-0000-000000000001', 'Ganesh General Stores', 'Suresh Patil', '919922011001', 'Panchavati, Nashik', 150000);

insert into products (distributor_id, name, category, rate, mrp) values
  ('00000000-0000-0000-0000-000000000001', 'Tata Salt 1kg', 'Staples', 24.5, 28),
  ('00000000-0000-0000-0000-000000000001', 'Surf Excel 1kg', 'Detergent', 128, 145),
  ('00000000-0000-0000-0000-000000000001', 'Fortune Sunflower Oil 1L', 'Edible Oil', 148, 165);
