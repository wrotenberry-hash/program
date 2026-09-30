-- 0001_foundation
-- Phase 1 schema. Every table has RLS enabled with explicit policies before
-- any data lands (CLAUDE.md §3.8 in spirit, §5 escalation list).
-- Naming: snake_case. League-scoped tables carry league_id.

-- ---------------------------------------------------------------------------
-- Reference data: global, public read, written only by migrations and seeds.
-- ---------------------------------------------------------------------------

create table public.conferences (
  id          text primary key,                       -- slug: 'sec'
  name        text not null,                          -- 'Southeastern Conference'
  short_name  text not null,                          -- 'SEC'
  tier        text not null check (tier in ('power', 'group', 'independent')),
  sort_order  smallint not null default 100,
  created_at  timestamptz not null default now()
);

create table public.schools (
  id             text primary key,                    -- slug: 'texas'
  name           text not null,                       -- 'Texas'
  full_name      text not null,                       -- 'University of Texas at Austin'
  nickname       text not null,                       -- 'Longhorns'
  conference_id  text not null references public.conferences (id),
  city           text,
  state          text,
  created_at     timestamptz not null default now()
);
create index schools_conference_id_idx on public.schools (conference_id);

-- Directional: each school lists its rivals in rank order. Rank 1 is primary.
create table public.rivalry_pairings (
  school_id        text not null references public.schools (id),
  rival_school_id  text not null references public.schools (id),
  rank             smallint not null check (rank between 1 and 3),
  primary key (school_id, rank),
  unique (school_id, rival_school_id),
  check (school_id <> rival_school_id)
);

create table public.seasons (
  id         text primary key,                        -- '2026'
  year       smallint not null unique,
  starts_on  date not null,
  ends_on    date not null,
  status     text not null default 'upcoming'
             check (status in ('upcoming', 'active', 'complete')),
  created_at timestamptz not null default now()
);

create table public.season_weeks (
  season_id    text not null references public.seasons (id) on delete cascade,
  week_number  smallint not null,
  starts_on    date not null,                         -- the Saturday
  locks_at     timestamptz not null,                  -- pre-game inputs freeze
  kind         text not null
               check (kind in ('nonconference', 'conference', 'rivalry', 'championship')),
  primary key (season_id, week_number)
);

-- Tunables. Never hard-code a balance value (CLAUDE.md §5).
create table public.game_config (
  key          text primary key,
  value        jsonb not null,
  description  text not null,
  updated_at   timestamptz not null default now()
);

-- Monetization layer: config tables exist from day one, empty, flag off.
create table public.purchasables (
  id           text primary key,
  name         text not null,
  kind         text not null,                         -- 'currency', 'pack', 'pass', 'speedup', 'shards'
  price_cents  integer not null check (price_cents >= 0),
  currency     text not null default 'USD',
  config       jsonb not null default '{}'::jsonb,
  enabled      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- entries: [{ "item": text, "weight": number }]. Odds are derived from weights
-- and must be displayed wherever the table is sold (CLAUDE.md §3.5).
create table public.drop_tables (
  id           text primary key,
  name         text not null,
  entries      jsonb not null default '[]'::jsonb,
  enabled      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  date_of_birth  date,                                -- age gate input; null until asked
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Age gate helper. STABLE because it reads current_date.
create or replace function public.is_minor(dob date)
returns boolean
language sql
stable
as $$
  select dob is not null and dob > (current_date - interval '18 years')::date;
$$;

-- Create a profile row for every new auth user, carrying signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, date_of_birth)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The shard model (docs/phase-0/sharding-and-rivalry.md)
-- ---------------------------------------------------------------------------

create table public.leagues (
  id             uuid primary key default gen_random_uuid(),
  conference_id  text not null references public.conferences (id),
  number         integer not null,
  opened_at      timestamptz not null default now(),
  settled_at     timestamptz,
  unique (conference_id, number)
);

create table public.factions (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues (id) on delete cascade,
  school_id   text not null references public.schools (id),
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (league_id, school_id)
);
create index factions_league_id_idx on public.factions (league_id);

-- A program is one account's instance of one school. Never deleted.
-- account_id is nullable and set null on account deletion so the program
-- persists even if the account does not (CLAUDE.md §3.4).
create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references auth.users (id) on delete set null,
  school_id   text not null references public.schools (id),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index programs_one_per_account on public.programs (account_id)
  where account_id is not null;
create index programs_school_id_idx on public.programs (school_id);

create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

-- A program's school never changes.
create or replace function public.programs_lock_school()
returns trigger
language plpgsql
as $$
begin
  if new.school_id <> old.school_id then
    raise exception 'a program''s school cannot change';
  end if;
  return new;
end;
$$;

create trigger programs_lock_school
  before update on public.programs
  for each row execute function public.programs_lock_school();

-- The program's seat in a League. Not the program itself.
create table public.league_seats (
  program_id      uuid not null references public.programs (id),
  league_id       uuid not null references public.leagues (id) on delete cascade,
  faction_id      uuid not null references public.factions (id) on delete cascade,
  role            text not null default 'member'
                  check (role in ('member', 'officer', 'leader')),
  status          text not null default 'active'
                  check (status in ('active', 'alumni')),
  joined_at       timestamptz not null default now(),
  last_active_at  timestamptz not null default now(),
  primary key (program_id, league_id)
);
create unique index league_seats_one_active_per_program on public.league_seats (program_id)
  where status = 'active';
create index league_seats_faction_id_idx on public.league_seats (faction_id);
create index league_seats_league_id_idx on public.league_seats (league_id);

-- Sim-run programs filling empty school slots in a League.
create table public.house_programs (
  league_id   uuid not null references public.leagues (id) on delete cascade,
  school_id   text not null references public.schools (id),
  created_at  timestamptz not null default now(),
  primary key (league_id, school_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security. Every table, before any data.
-- Writes to reference and League tables happen only through migrations,
-- seeds, and (from Phase 2) security definer functions. No write policies.
-- ---------------------------------------------------------------------------

alter table public.conferences      enable row level security;
alter table public.schools          enable row level security;
alter table public.rivalry_pairings enable row level security;
alter table public.seasons          enable row level security;
alter table public.season_weeks     enable row level security;
alter table public.game_config      enable row level security;
alter table public.purchasables     enable row level security;
alter table public.drop_tables      enable row level security;
alter table public.profiles         enable row level security;
alter table public.leagues          enable row level security;
alter table public.factions         enable row level security;
alter table public.programs         enable row level security;
alter table public.league_seats     enable row level security;
alter table public.house_programs   enable row level security;

-- Public reference data: anyone may read.
create policy "conferences are public"      on public.conferences      for select to anon, authenticated using (true);
create policy "schools are public"          on public.schools          for select to anon, authenticated using (true);
create policy "rivalries are public"        on public.rivalry_pairings for select to anon, authenticated using (true);
create policy "seasons are public"          on public.seasons          for select to anon, authenticated using (true);
create policy "season weeks are public"     on public.season_weeks     for select to anon, authenticated using (true);
create policy "game config is public"       on public.game_config      for select to anon, authenticated using (true);
create policy "purchasables are public"     on public.purchasables     for select to anon, authenticated using (enabled);
create policy "drop tables are public"      on public.drop_tables      for select to anon, authenticated using (enabled);

-- League structure: signed-in players may read. No client writes.
create policy "leagues readable when signed in"        on public.leagues        for select to authenticated using (true);
create policy "factions readable when signed in"       on public.factions       for select to authenticated using (true);
create policy "house programs readable when signed in" on public.house_programs for select to authenticated using (true);

-- Profiles: owner only.
create policy "read own profile"   on public.profiles for select to authenticated using (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Programs: owner reads and creates. Rename allowed; school locked by trigger.
-- No delete policy: programs persist forever.
create policy "read own program"   on public.programs for select to authenticated using (auth.uid() = account_id);
create policy "create own program" on public.programs for insert to authenticated with check (auth.uid() = account_id);
create policy "update own program" on public.programs for update to authenticated using (auth.uid() = account_id) with check (auth.uid() = account_id);

-- Seats: a player sees their own program's seats. Faction-mate visibility is
-- a Phase 2 decision (CLAUDE.md §4: what data one player sees about another).
create policy "read own seats" on public.league_seats for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));
