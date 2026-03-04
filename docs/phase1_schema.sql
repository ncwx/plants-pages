create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'reading_status') then
    create type public.reading_status as enum ('want_to_read', 'reading', 'finished', 'dnf');
  end if;

  if not exists (select 1 from pg_type where typname = 'privacy_level') then
    create type public.privacy_level as enum ('private', 'friends_only', 'public');
  end if;

  if not exists (select 1 from pg_type where typname = 'rarity_level') then
    create type public.rarity_level as enum ('common', 'uncommon', 'rare', 'epic', 'legendary');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  privacy public.privacy_level not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  isbn13 text,
  cover_url text,
  published_year int,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- basic dedupe helpers (optional)
  constraint books_isbn13_unique unique (isbn13)
);

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
before update on public.books
for each row execute function public.set_updated_at();

create table if not exists public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,

  status public.reading_status not null default 'want_to_read',
  rating int check (rating between 1 and 5),
  notes text,
  pages int check (pages >= 0),

  started_at date,
  finished_at date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_books_one_row_per_book_per_user unique (user_id, book_id)
);

drop trigger if exists trg_user_books_updated_at on public.user_books;
create trigger trg_user_books_updated_at
before update on public.user_books
for each row execute function public.set_updated_at();

create table if not exists public.gardens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  biome text not null default 'starter',
  xp int not null default 0 check (xp >= 0),
  seeds int not null default 0 check (seeds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_gardens_updated_at on public.gardens;
create trigger trg_gardens_updated_at
before update on public.gardens
for each row execute function public.set_updated_at();

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rarity public.rarity_level not null default 'common',
  family text,
  unlock_xp int not null default 0 check (unlock_xp >= 0),
  asset_key text, -- e.g. "plant_fern_01"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_plants_updated_at on public.plants;
create trigger trg_plants_updated_at
before update on public.plants
for each row execute function public.set_updated_at();

create table if not exists public.garden_items (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete restrict,

  x int not null default 0,
  y int not null default 0,
  rotation int not null default 0,
  growth_stage int not null default 1 check (growth_stage between 1 and 3),

  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint garden_items_unique_position unique (garden_id, x, y)
);

drop trigger if exists trg_garden_items_updated_at on public.garden_items;
create trigger trg_garden_items_updated_at
before update on public.garden_items
for each row execute function public.set_updated_at();

create index if not exists idx_user_books_user_id on public.user_books(user_id);
create index if not exists idx_user_books_status on public.user_books(status);
create index if not exists idx_user_books_finished_at on public.user_books(finished_at);
create index if not exists idx_books_title on public.books(title);
create index if not exists idx_books_author on public.books(author);
create index if not exists idx_garden_items_garden_id on public.garden_items(garden_id);

alter table public.profiles enable row level security;
alter table public.user_books enable row level security;
alter table public.gardens enable row level security;
alter table public.garden_items enable row level security;

alter table public.books enable row level security;
alter table public.plants enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "user_books_crud_own" on public.user_books;
create policy "user_books_crud_own"
on public.user_books
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "gardens_crud_own" on public.gardens;
create policy "gardens_crud_own"
on public.gardens
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "garden_items_crud_own" on public.garden_items;
create policy "garden_items_crud_own"
on public.garden_items
for all
using (
  exists (
    select 1 from public.gardens g
    where g.id = garden_items.garden_id
      and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.gardens g
    where g.id = garden_items.garden_id
      and g.user_id = auth.uid()
  )
);

drop policy if exists "books_select_authenticated" on public.books;
create policy "books_select_authenticated"
on public.books for select
to authenticated
using (true);

drop policy if exists "plants_select_authenticated" on public.plants;
create policy "plants_select_authenticated"
on public.plants for select
to authenticated
using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, privacy)
  values (new.id, null, 'private')
  on conflict (id) do nothing;

  insert into public.gardens (user_id, biome, xp, seeds)
  values (new.id, 'starter', 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.plants (name, rarity, family, unlock_xp, asset_key)
values
  ('Fern', 'common', 'Green', 0, 'plant_fern_01'),
  ('Daisy', 'common', 'Flower', 25, 'plant_daisy_01'),
  ('Cactus', 'uncommon', 'Desert', 75, 'plant_cactus_01'),
  ('Orchid', 'rare', 'Flower', 150, 'plant_orchid_01')
on conflict (name) do nothing;