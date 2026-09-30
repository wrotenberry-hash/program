-- 0003_phase2_program_and_placement
-- League placement, factions with roster and chat, house programs, and the
-- athletic director build-and-wait loop. All writes to League and economy
-- tables go through SECURITY DEFINER functions that check auth.uid().
-- Design: docs/phase-0/sharding-and-rivalry.md §6.

-- ---------------------------------------------------------------------------
-- Config helpers
-- ---------------------------------------------------------------------------

create or replace function public.config_int(p_key text, p_default integer)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::integer from public.game_config where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- Facilities (reference) and per-program state
-- ---------------------------------------------------------------------------

create table public.facilities (
  id           text primary key,          -- 'booster-club'
  name         text not null,
  description  text not null,
  sort_order   smallint not null default 100
);

create table public.facility_levels (
  facility_id       text not null references public.facilities (id) on delete cascade,
  level             smallint not null check (level between 1 and 20),
  cost              integer not null check (cost >= 0),          -- cash to reach this level
  duration_seconds  integer not null check (duration_seconds >= 0),
  income_per_hour   integer,                                     -- booster club only
  primary key (facility_id, level)
);

create table public.program_facilities (
  program_id            uuid not null references public.programs (id) on delete cascade,
  facility_id           text not null references public.facilities (id),
  level                 smallint not null default 0,
  upgrade_to            smallint,
  upgrade_started_at    timestamptz,
  upgrade_completes_at  timestamptz,
  primary key (program_id, facility_id),
  check ((upgrade_to is null) = (upgrade_completes_at is null))
);

create table public.program_treasury (
  program_id         uuid primary key references public.programs (id) on delete cascade,
  cash               bigint not null default 0 check (cash >= 0),
  last_collected_at  timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger program_treasury_set_updated_at
  before update on public.program_treasury
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Faction chat
-- ---------------------------------------------------------------------------

create table public.faction_messages (
  id          bigint generated always as identity primary key,
  faction_id  uuid not null references public.factions (id) on delete cascade,
  program_id  uuid not null references public.programs (id),
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index faction_messages_faction_created_idx on public.faction_messages (faction_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS for the new tables
-- ---------------------------------------------------------------------------

alter table public.facilities         enable row level security;
alter table public.facility_levels    enable row level security;
alter table public.program_facilities enable row level security;
alter table public.program_treasury   enable row level security;
alter table public.faction_messages   enable row level security;

create policy "facilities are public"      on public.facilities      for select to anon, authenticated using (true);
create policy "facility levels are public" on public.facility_levels for select to anon, authenticated using (true);

create policy "read own facilities" on public.program_facilities for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));
create policy "read own treasury" on public.program_treasury for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));

-- Faction membership test for the calling account. STABLE, RLS-safe.
create or replace function public.is_faction_member(p_faction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_seats s
    join public.programs p on p.id = s.program_id
    where s.faction_id = p_faction_id
      and s.status = 'active'
      and p.account_id = auth.uid()
  );
$$;
revoke execute on function public.is_faction_member(uuid) from public, anon;
grant execute on function public.is_faction_member(uuid) to authenticated;

create policy "faction members read chat" on public.faction_messages for select to authenticated
  using (public.is_faction_member(faction_id));
create policy "faction members post chat" on public.faction_messages for insert to authenticated
  with check (
    public.is_faction_member(faction_id)
    and exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid())
  );

-- Faction-mates may see each other's program row (name and school only live there).
create policy "faction mates read programs" on public.programs for select to authenticated
  using (exists (
    select 1 from public.league_seats mine
    join public.programs mp on mp.id = mine.program_id
    join public.league_seats theirs on theirs.faction_id = mine.faction_id
    where mp.account_id = auth.uid() and mine.status = 'active'
      and theirs.program_id = programs.id and theirs.status = 'active'
  ));

-- Realtime for chat. Postgres Changes respects RLS for authenticated clients.
alter publication supabase_realtime add table public.faction_messages;

-- ---------------------------------------------------------------------------
-- Placement (docs/phase-0/sharding-and-rivalry.md §6.1)
-- ---------------------------------------------------------------------------

create or replace function public.place_program(p_program_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school   text;
  v_conf     text;
  v_cap      integer;
  v_league   uuid;
  v_faction  uuid;
  v_number   integer;
  v_role     text := 'member';
begin
  select school_id into v_school from public.programs where id = p_program_id;
  if v_school is null then raise exception 'program % not found', p_program_id; end if;
  select conference_id into v_conf from public.schools where id = v_school;

  -- Already seated: return the League.
  select league_id into v_league from public.league_seats where program_id = p_program_id and status = 'active';
  if v_league is not null then return v_league; end if;

  -- One placement at a time per conference keeps the cap honest.
  perform pg_advisory_xact_lock(hashtext('place:' || v_conf));
  v_cap := public.config_int('FACTION_CAP', 100);

  -- Candidate Leagues: open, with room in this school's faction. Score by
  -- rivalry fill (primary rival weighted 3, secondary 1, tertiary 0.5), then
  -- total active humans, then lowest number.
  select l.id into v_league
  from public.leagues l
  where l.conference_id = v_conf
    and l.settled_at is null
    and (
      select count(*) from public.league_seats s
      join public.factions f on f.id = s.faction_id
      where f.league_id = l.id and f.school_id = v_school and s.status = 'active'
    ) < v_cap
  order by
    (
      select coalesce(sum(
        (case rp.rank when 1 then 3.0 when 2 then 1.0 else 0.5 end) *
        (select count(*) from public.league_seats s2
         join public.factions f2 on f2.id = s2.faction_id
         where f2.league_id = l.id and f2.school_id = rp.rival_school_id and s2.status = 'active')
      ), 0)
      from public.rivalry_pairings rp where rp.school_id = v_school
    ) desc,
    (select count(*) from public.league_seats s3 where s3.league_id = l.id and s3.status = 'active') desc,
    l.number asc
  limit 1;

  if v_league is null then
    select coalesce(max(number), 0) + 1 into v_number from public.leagues where conference_id = v_conf;
    insert into public.leagues (conference_id, number) values (v_conf, v_number) returning id into v_league;
    -- A new League is born with a house program in every slot.
    insert into public.house_programs (league_id, school_id)
    select v_league, id from public.schools where conference_id = v_conf;
  end if;

  select id into v_faction from public.factions where league_id = v_league and school_id = v_school;
  if v_faction is null then
    insert into public.factions (league_id, school_id, name)
    select v_league, v_school, s.name || ' ' || s.nickname from public.schools s where s.id = v_school
    returning id into v_faction;
    delete from public.house_programs where league_id = v_league and school_id = v_school;
    v_role := 'leader';
  end if;

  insert into public.league_seats (program_id, league_id, faction_id, role)
  values (p_program_id, v_league, v_faction, v_role);
  return v_league;
end;
$$;
revoke execute on function public.place_program(uuid) from public, anon, authenticated;

-- The caller's own program. Idempotent.
create or replace function public.place_my_program()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_program uuid;
begin
  select id into v_program from public.programs where account_id = auth.uid();
  if v_program is null then raise exception 'no program for this account'; end if;
  return public.place_program(v_program);
end;
$$;
revoke execute on function public.place_my_program() from public, anon;
grant execute on function public.place_my_program() to authenticated;

-- ---------------------------------------------------------------------------
-- Program initialization: treasury, facilities, placement. Runs on insert.
-- ---------------------------------------------------------------------------

create or replace function public.init_program()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.program_treasury (program_id, cash)
  values (new.id, public.config_int('STARTING_CASH', 500))
  on conflict do nothing;

  insert into public.program_facilities (program_id, facility_id, level)
  select new.id, f.id, case when f.id = 'booster-club' then 1 else 0 end
  from public.facilities f
  on conflict do nothing;

  perform public.place_program(new.id);
  return new;
end;
$$;
revoke execute on function public.init_program() from public, anon, authenticated;

create trigger programs_init
  after insert on public.programs
  for each row execute function public.init_program();

-- ---------------------------------------------------------------------------
-- Faction roster: visible to members only. Display name comes from profiles
-- but nothing else does; date of birth never leaves the profile row.
-- ---------------------------------------------------------------------------

create or replace function public.faction_roster(p_faction_id uuid)
returns table (
  program_id      uuid,
  program_name    text,
  display_name    text,
  role            text,
  joined_at       timestamptz,
  last_active_at  timestamptz,
  is_me           boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.program_id, p.name, coalesce(pr.display_name, 'Fan'), s.role, s.joined_at, s.last_active_at,
         p.account_id = auth.uid()
  from public.league_seats s
  join public.programs p on p.id = s.program_id
  left join public.profiles pr on pr.id = p.account_id
  where s.faction_id = p_faction_id
    and s.status = 'active'
    and public.is_faction_member(p_faction_id)
  order by (s.role = 'leader') desc, (s.role = 'officer') desc, s.joined_at asc;
$$;
revoke execute on function public.faction_roster(uuid) from public, anon;
grant execute on function public.faction_roster(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The athletic director loop: collect, start, claim.
-- ---------------------------------------------------------------------------

create or replace function public.my_program_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.programs where account_id = auth.uid();
$$;
revoke execute on function public.my_program_id() from public, anon;
grant execute on function public.my_program_id() to authenticated;

create or replace function public.touch_activity(p_program_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.league_seats set last_active_at = now()
  where program_id = p_program_id and status = 'active';
$$;
revoke execute on function public.touch_activity(uuid) from public, anon, authenticated;

-- Income accrued since last collection, capped at COLLECT_CAP_HOURS.
create or replace function public.collect_income()
returns table (collected bigint, cash bigint, income_per_hour integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program  uuid := public.my_program_id();
  v_rate     integer;
  v_cap_h    integer := public.config_int('COLLECT_CAP_HOURS', 8);
  v_hours    numeric;
  v_amount   bigint;
  v_cash     bigint;
begin
  if v_program is null then raise exception 'no program for this account'; end if;

  select coalesce(fl.income_per_hour, 0) into v_rate
  from public.program_facilities pf
  join public.facility_levels fl on fl.facility_id = pf.facility_id and fl.level = pf.level
  where pf.program_id = v_program and pf.facility_id = 'booster-club';
  v_rate := coalesce(v_rate, 0);

  select least(extract(epoch from (now() - t.last_collected_at)) / 3600.0, v_cap_h) into v_hours
  from public.program_treasury t where t.program_id = v_program for update;
  v_amount := floor(v_hours * v_rate);

  update public.program_treasury t
  set cash = t.cash + v_amount, last_collected_at = now()
  where t.program_id = v_program
  returning t.cash into v_cash;

  perform public.touch_activity(v_program);
  return query select v_amount, v_cash, v_rate;
end;
$$;
revoke execute on function public.collect_income() from public, anon;
grant execute on function public.collect_income() to authenticated;

create or replace function public.start_upgrade(p_facility_id text)
returns table (facility_id text, upgrade_to smallint, upgrade_completes_at timestamptz, cash bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program   uuid := public.my_program_id();
  v_level     smallint;
  v_next      smallint;
  v_cost      integer;
  v_duration  integer;
  v_cash      bigint;
  v_active    integer;
  v_max       integer := public.config_int('MAX_CONCURRENT_UPGRADES', 1);
  v_done_at   timestamptz;
begin
  if v_program is null then raise exception 'no program for this account'; end if;

  select pf.level into v_level from public.program_facilities pf
  where pf.program_id = v_program and pf.facility_id = p_facility_id for update;
  if v_level is null then raise exception 'unknown facility'; end if;
  if exists (select 1 from public.program_facilities pf where pf.program_id = v_program and pf.facility_id = p_facility_id and pf.upgrade_to is not null) then
    raise exception 'that facility is already upgrading';
  end if;

  select count(*) into v_active from public.program_facilities pf where pf.program_id = v_program and pf.upgrade_to is not null;
  if v_active >= v_max then raise exception 'your crew is busy on another upgrade'; end if;

  v_next := v_level + 1;
  select fl.cost, fl.duration_seconds into v_cost, v_duration
  from public.facility_levels fl where fl.facility_id = p_facility_id and fl.level = v_next;
  if v_cost is null then raise exception 'that facility is at its top level'; end if;

  select t.cash into v_cash from public.program_treasury t where t.program_id = v_program for update;
  if v_cash < v_cost then raise exception 'not enough budget: need %, have %', v_cost, v_cash; end if;

  v_done_at := now() + make_interval(secs => v_duration);
  update public.program_treasury t set cash = t.cash - v_cost where t.program_id = v_program returning t.cash into v_cash;
  update public.program_facilities pf
  set upgrade_to = v_next, upgrade_started_at = now(), upgrade_completes_at = v_done_at
  where pf.program_id = v_program and pf.facility_id = p_facility_id;

  perform public.touch_activity(v_program);
  return query select p_facility_id, v_next, v_done_at, v_cash;
end;
$$;
revoke execute on function public.start_upgrade(text) from public, anon;
grant execute on function public.start_upgrade(text) to authenticated;

create or replace function public.claim_upgrade(p_facility_id text)
returns table (facility_id text, level smallint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program uuid := public.my_program_id();
  v_to      smallint;
  v_done    timestamptz;
begin
  if v_program is null then raise exception 'no program for this account'; end if;
  select pf.upgrade_to, pf.upgrade_completes_at into v_to, v_done
  from public.program_facilities pf where pf.program_id = v_program and pf.facility_id = p_facility_id for update;
  if v_to is null then raise exception 'nothing to claim'; end if;
  if v_done > now() then raise exception 'not finished yet'; end if;

  update public.program_facilities pf
  set level = v_to, upgrade_to = null, upgrade_started_at = null, upgrade_completes_at = null
  where pf.program_id = v_program and pf.facility_id = p_facility_id;

  perform public.touch_activity(v_program);
  return query select p_facility_id, v_to;
end;
$$;
revoke execute on function public.claim_upgrade(text) from public, anon;
grant execute on function public.claim_upgrade(text) to authenticated;

-- Dormancy sweep. Not scheduled yet; Phase 3 adds the cron.
create or replace function public.sweep_dormant_seats()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_days integer := public.config_int('DORMANCY_DAYS', 30); v_n integer;
begin
  update public.league_seats set status = 'alumni'
  where status = 'active' and last_active_at < now() - make_interval(days => v_days);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function public.sweep_dormant_seats() from public, anon, authenticated;
