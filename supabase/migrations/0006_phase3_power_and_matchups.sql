-- 0006_phase3_power_and_matchups
-- Facets, emphasis, staff (heroes), challenges, and the matchup resolver.
-- Design: docs/phase-3/power-and-matchups.md.

-- ---------------------------------------------------------------------------
-- Facet weights and emphasis
-- ---------------------------------------------------------------------------

create table public.facility_facets (
  facility_id   text primary key references public.facilities (id) on delete cascade,
  rushing       numeric(4,3) not null,
  passing       numeric(4,3) not null,
  run_defense   numeric(4,3) not null,
  pass_defense  numeric(4,3) not null,
  check (abs((rushing + passing + run_defense + pass_defense) - 1) < 0.001)
);

create table public.emphases (
  id            text primary key,           -- 'balanced'
  name          text not null,
  blurb         text not null,
  sort_order    smallint not null default 100,
  rushing       numeric(4,3) not null default 1,   -- multipliers
  passing       numeric(4,3) not null default 1,
  run_defense   numeric(4,3) not null default 1,
  pass_defense  numeric(4,3) not null default 1
);

alter table public.programs add column if not exists emphasis_id text references public.emphases (id);
alter table public.programs add column if not exists share_code text;
create unique index if not exists programs_share_code_key on public.programs (share_code) where share_code is not null;

-- ---------------------------------------------------------------------------
-- Staff: the heroes. Shards unlock and star them, cash levels them.
-- ---------------------------------------------------------------------------

create table public.staff (
  id               text primary key,        -- 'oc-vega'
  name             text not null,           -- fictional
  role             text not null,           -- 'Offensive Coordinator'
  rarity           text not null check (rarity in ('common', 'rare', 'epic')),
  base_power       integer not null,
  power_per_level  integer not null,
  unlock_shards    integer not null,
  star_shards      integer not null,        -- per additional star
  max_stars        smallint not null default 5,
  max_level        smallint not null default 20,
  rushing          numeric(4,3) not null,
  passing          numeric(4,3) not null,
  run_defense      numeric(4,3) not null,
  pass_defense     numeric(4,3) not null,
  sort_order       smallint not null default 100,
  check (abs((rushing + passing + run_defense + pass_defense) - 1) < 0.001)
);

create table public.program_staff (
  program_id       uuid not null references public.programs (id) on delete cascade,
  staff_id         text not null references public.staff (id),
  shards           integer not null default 0 check (shards >= 0),
  stars            smallint not null default 0 check (stars >= 0),   -- 0 = locked
  level            smallint not null default 1 check (level >= 1),
  updated_at       timestamptz not null default now(),
  primary key (program_id, staff_id)
);
create trigger program_staff_set_updated_at before update on public.program_staff
  for each row execute function public.set_updated_at();

alter table public.program_treasury add column if not exists last_scouted_at timestamptz;

-- ---------------------------------------------------------------------------
-- Games
-- ---------------------------------------------------------------------------

create table public.games (
  id               uuid primary key default gen_random_uuid(),
  season_id        text not null references public.seasons (id),
  week_number      smallint not null,
  league_id        uuid references public.leagues (id) on delete cascade,  -- null for non-conference
  kind             text not null check (kind in ('challenge', 'conference', 'rivalry')),
  home_program_id  uuid not null references public.programs (id),
  away_program_id  uuid not null references public.programs (id),
  status           text not null default 'scheduled' check (status in ('scheduled', 'resolved')),
  locks_at         timestamptz not null,
  seed             double precision,
  inputs           jsonb,
  result           jsonb,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  check (home_program_id <> away_program_id)
);
create index games_home_idx on public.games (home_program_id, created_at desc);
create index games_away_idx on public.games (away_program_id, created_at desc);
create index games_due_idx on public.games (locks_at) where status = 'scheduled';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.facility_facets enable row level security;
alter table public.emphases        enable row level security;
alter table public.staff           enable row level security;
alter table public.program_staff   enable row level security;
alter table public.games           enable row level security;

create policy "facility facets are public" on public.facility_facets for select to anon, authenticated using (true);
create policy "emphases are public"        on public.emphases        for select to anon, authenticated using (true);
create policy "staff catalog is public"    on public.staff           for select to anon, authenticated using (true);
create policy "read own staff" on public.program_staff for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));
create policy "participants read games" on public.games for select to authenticated
  using (exists (select 1 from public.programs p where p.account_id = auth.uid() and p.id in (home_program_id, away_program_id)));

-- Opponents in a game may read each other's program row (name, school).
create or replace function public.is_opponent(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.games g
    join public.programs me on me.account_id = auth.uid()
    where (g.home_program_id = me.id and g.away_program_id = p_program_id)
       or (g.away_program_id = me.id and g.home_program_id = p_program_id)
  );
$$;
revoke execute on function public.is_opponent(uuid) from public, anon;
grant execute on function public.is_opponent(uuid) to authenticated;
create policy "opponents read programs" on public.programs for select to authenticated
  using (public.is_opponent(id));

-- ---------------------------------------------------------------------------
-- Share codes and staff rows on program creation (extends init_program)
-- ---------------------------------------------------------------------------

create or replace function public.make_share_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.programs where share_code = code);
  end loop;
  return code;
end;
$$;

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

  insert into public.program_staff (program_id, staff_id)
  select new.id, s.id from public.staff s
  on conflict do nothing;

  if new.share_code is null or new.emphasis_id is null then
    update public.programs
    set share_code = coalesce(share_code, public.make_share_code()),
        emphasis_id = coalesce(emphasis_id, 'balanced')
    where id = new.id;
  end if;

  perform public.place_program(new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Power by facet
-- ---------------------------------------------------------------------------

create or replace function public.staff_power(p_stars smallint, p_level smallint, p_base integer, p_per_level integer)
returns integer
language sql
immutable
as $$
  select case when p_stars <= 0 then 0
    else round((p_base + p_per_level * (p_level - 1)) * (1 + 0.25 * (p_stars - 1)))::integer end;
$$;

-- Raw facet powers (before emphasis) plus the total.
create or replace function public.facet_powers(p_program_id uuid)
returns table (rushing numeric, passing numeric, run_defense numeric, pass_defense numeric, total integer)
language sql
stable
security definer
set search_path = public
as $$
  with fac as (
    select coalesce(fl.power, 0) as power, ff.rushing, ff.passing, ff.run_defense, ff.pass_defense
    from public.program_facilities pf
    join public.facility_levels fl on fl.facility_id = pf.facility_id and fl.level = pf.level
    left join public.facility_facets ff on ff.facility_id = pf.facility_id
    where pf.program_id = p_program_id
  ),
  stf as (
    select public.staff_power(ps.stars, ps.level, s.base_power, s.power_per_level) as power,
           s.rushing, s.passing, s.run_defense, s.pass_defense
    from public.program_staff ps join public.staff s on s.id = ps.staff_id
    where ps.program_id = p_program_id and ps.stars > 0
  ),
  allrows as (
    select power, coalesce(rushing, 0.25) r, coalesce(passing, 0.25) p, coalesce(run_defense, 0.25) rd, coalesce(pass_defense, 0.25) pd from fac
    union all
    select power, rushing, passing, run_defense, pass_defense from stf
  )
  select coalesce(sum(power * r), 0), coalesce(sum(power * p), 0), coalesce(sum(power * rd), 0), coalesce(sum(power * pd), 0), coalesce(sum(power), 0)::integer
  from allrows;
$$;
revoke execute on function public.facet_powers(uuid) from public, anon;
grant execute on function public.facet_powers(uuid) to authenticated;

-- Facet powers after the program's emphasis.
create or replace function public.effective_facets(p_program_id uuid)
returns table (rushing numeric, passing numeric, run_defense numeric, pass_defense numeric, total integer, emphasis_id text)
language sql
stable
security definer
set search_path = public
as $$
  select round(f.rushing * e.rushing, 1), round(f.passing * e.passing, 1),
         round(f.run_defense * e.run_defense, 1), round(f.pass_defense * e.pass_defense, 1),
         f.total, e.id
  from public.facet_powers(p_program_id) f
  join public.programs p on p.id = p_program_id
  join public.emphases e on e.id = coalesce(p.emphasis_id, 'balanced');
$$;
revoke execute on function public.effective_facets(uuid) from public, anon;
grant execute on function public.effective_facets(uuid) to authenticated;

create or replace function public.set_emphasis(p_emphasis_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_program uuid := public.my_program_id();
begin
  if v_program is null then raise exception 'no program for this account'; end if;
  if not exists (select 1 from public.emphases where id = p_emphasis_id) then raise exception 'unknown emphasis'; end if;
  update public.programs set emphasis_id = p_emphasis_id where id = v_program;
  perform public.touch_activity(v_program);
end;
$$;
revoke execute on function public.set_emphasis(text) from public, anon;
grant execute on function public.set_emphasis(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Staff actions: scout (earn shards on a cooldown), unlock or star up, level up
-- ---------------------------------------------------------------------------

-- Scouting grants a fixed number of shards to one coach chosen by a rotation
-- (day of year plus a per-program offset). Deterministic: no random drops.
create or replace function public.scout()
returns table (staff_id text, shards_granted integer, shards integer, next_scout_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program   uuid := public.my_program_id();
  v_cooldown  integer := public.config_int('SCOUT_COOLDOWN_HOURS', 4);
  v_grant     integer := public.config_int('SCOUT_SHARDS', 5);
  v_last      timestamptz;
  v_count     integer;
  v_idx       integer;
  v_staff     text;
  v_total     integer;
begin
  if v_program is null then raise exception 'no program for this account'; end if;
  select last_scouted_at into v_last from public.program_treasury where program_id = v_program for update;
  if v_last is not null and v_last + make_interval(hours => v_cooldown) > now() then
    raise exception 'scouts are still out; back at %', to_char(v_last + make_interval(hours => v_cooldown), 'HH24:MI');
  end if;

  select count(*) into v_count from public.staff;
  v_idx := (extract(doy from now())::int + (('x' || substr(md5(v_program::text), 1, 8))::bit(32)::int & 1023) + floor(extract(epoch from now()) / (v_cooldown * 3600))::int) % v_count;
  select s.id into v_staff from public.staff s order by s.sort_order, s.id offset v_idx limit 1;

  insert into public.program_staff (program_id, staff_id, shards) values (v_program, v_staff, v_grant)
  on conflict (program_id, staff_id) do update set shards = public.program_staff.shards + v_grant
  returning public.program_staff.shards into v_total;

  update public.program_treasury set last_scouted_at = now() where program_id = v_program;
  perform public.touch_activity(v_program);
  return query select v_staff, v_grant, v_total, now() + make_interval(hours => v_cooldown);
end;
$$;
revoke execute on function public.scout() from public, anon;
grant execute on function public.scout() to authenticated;

-- Unlock (stars 0 -> 1) or add a star, spending shards.
create or replace function public.star_up_staff(p_staff_id text)
returns table (staff_id text, stars smallint, shards integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program uuid := public.my_program_id();
  v_stars smallint; v_shards integer; v_cost integer; v_max smallint;
begin
  if v_program is null then raise exception 'no program for this account'; end if;
  select ps.stars, ps.shards, s.max_stars, case when ps.stars = 0 then s.unlock_shards else s.star_shards end
  into v_stars, v_shards, v_max, v_cost
  from public.program_staff ps join public.staff s on s.id = ps.staff_id
  where ps.program_id = v_program and ps.staff_id = p_staff_id for update of ps;
  if v_stars is null then raise exception 'unknown coach'; end if;
  if v_stars >= v_max then raise exception 'already at max stars'; end if;
  if v_shards < v_cost then raise exception 'need % shards, have %', v_cost, v_shards; end if;
  update public.program_staff ps set shards = ps.shards - v_cost, stars = ps.stars + 1
  where ps.program_id = v_program and ps.staff_id = p_staff_id
  returning ps.stars, ps.shards into v_stars, v_shards;
  perform public.touch_activity(v_program);
  return query select p_staff_id, v_stars, v_shards;
end;
$$;
revoke execute on function public.star_up_staff(text) from public, anon;
grant execute on function public.star_up_staff(text) to authenticated;

create or replace function public.staff_level_cost(p_level smallint)
returns integer
language sql
stable
set search_path = public
as $$
  select public.config_int('STAFF_LEVEL_COST_BASE', 200) * p_level;
$$;

create or replace function public.level_up_staff(p_staff_id text)
returns table (staff_id text, level smallint, cash bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program uuid := public.my_program_id();
  v_level smallint; v_stars smallint; v_max smallint; v_cost integer; v_cash bigint;
begin
  if v_program is null then raise exception 'no program for this account'; end if;
  select ps.level, ps.stars, s.max_level into v_level, v_stars, v_max
  from public.program_staff ps join public.staff s on s.id = ps.staff_id
  where ps.program_id = v_program and ps.staff_id = p_staff_id for update of ps;
  if v_level is null then raise exception 'unknown coach'; end if;
  if v_stars = 0 then raise exception 'unlock this coach first'; end if;
  if v_level >= v_max then raise exception 'already at max level'; end if;
  v_cost := public.staff_level_cost(v_level);
  select t.cash into v_cash from public.program_treasury t where t.program_id = v_program for update;
  if v_cash < v_cost then raise exception 'not enough budget: need %, have %', v_cost, v_cash; end if;
  update public.program_treasury t set cash = t.cash - v_cost where t.program_id = v_program returning t.cash into v_cash;
  update public.program_staff ps set level = ps.level + 1 where ps.program_id = v_program and ps.staff_id = p_staff_id returning ps.level into v_level;
  perform public.touch_activity(v_program);
  return query select p_staff_id, v_level, v_cash;
end;
$$;
revoke execute on function public.level_up_staff(text) from public, anon;
grant execute on function public.level_up_staff(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Challenges
-- ---------------------------------------------------------------------------

create or replace function public.current_week()
returns table (season_id text, week_number smallint, kind text, locks_at timestamptz)
language sql
stable
set search_path = public
as $$
  select w.season_id, w.week_number, w.kind, w.locks_at
  from public.season_weeks w join public.seasons s on s.id = w.season_id
  where s.status = 'active' and w.starts_on <= current_date
  order by w.week_number desc limit 1;
$$;

create or replace function public.challenge_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.my_program_id();
  v_them uuid;
  v_week record;
  v_delay integer := public.config_int('CHALLENGE_LOCK_MINUTES', 10);
  v_game uuid;
begin
  if v_me is null then raise exception 'no program for this account'; end if;
  select id into v_them from public.programs where share_code = upper(trim(p_code));
  if v_them is null then raise exception 'no program has that code'; end if;
  if v_them = v_me then raise exception 'that is your own code'; end if;
  if exists (select 1 from public.games g where g.status = 'scheduled'
             and ((g.home_program_id = v_me and g.away_program_id = v_them) or (g.home_program_id = v_them and g.away_program_id = v_me))) then
    raise exception 'you already have a game scheduled with them';
  end if;
  select * into v_week from public.current_week();
  if v_week.season_id is null then raise exception 'no active season'; end if;

  insert into public.games (season_id, week_number, kind, home_program_id, away_program_id, locks_at)
  values (v_week.season_id, v_week.week_number, 'challenge', v_me, v_them, now() + make_interval(mins => v_delay))
  returning id into v_game;
  perform public.touch_activity(v_me);
  return v_game;
end;
$$;
revoke execute on function public.challenge_by_code(text) from public, anon;
grant execute on function public.challenge_by_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- The resolver. Deterministic from (seed, inputs). Never takes a result in.
-- ---------------------------------------------------------------------------

create or replace function public.resolve_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  h record; a record;
  v_seed double precision;
  ppe numeric := public.config_int('POINTS_PER_EDGE', 28);
  base_pts numeric := public.config_int('BASE_POINTS', 24);
  noise_sd numeric := public.config_int('SCORE_NOISE_SD_TENTHS', 85) / 10.0;
  e_hr numeric; e_hp numeric; e_ar numeric; e_ap numeric;
  u1 double precision; u2 double precision; n1 numeric; n2 numeric;
  hs integer; asc_ integer;
  h_exp numeric; a_exp numeric;
  biggest text; narrative text;
  h_name text; a_name text;
begin
  select * into g from public.games where id = p_game_id for update;
  if g.status <> 'scheduled' or g.locks_at > now() then return; end if;

  select * into h from public.effective_facets(g.home_program_id);
  select * into a from public.effective_facets(g.away_program_id);
  select name into h_name from public.programs where id = g.home_program_id;
  select name into a_name from public.programs where id = g.away_program_id;

  -- Seed: fixed per game, stored for replay.
  v_seed := ((('x' || substr(md5(g.id::text), 1, 8))::bit(32)::bigint % 2000000) / 1000000.0) - 1.0;
  perform setseed(v_seed);

  -- Edges in [-1, 1]. Guard against both sides being zero.
  e_hr := case when h.rushing + a.run_defense = 0 then 0 else (h.rushing - a.run_defense) / (h.rushing + a.run_defense) end;
  e_hp := case when h.passing + a.pass_defense = 0 then 0 else (h.passing - a.pass_defense) / (h.passing + a.pass_defense) end;
  e_ar := case when a.rushing + h.run_defense = 0 then 0 else (a.rushing - h.run_defense) / (a.rushing + h.run_defense) end;
  e_ap := case when a.passing + h.pass_defense = 0 then 0 else (a.passing - h.pass_defense) / (a.passing + h.pass_defense) end;

  h_exp := base_pts + ppe * (e_hr + e_hp);
  a_exp := base_pts + ppe * (e_ar + e_ap);

  -- Box-Muller normal noise from the seeded generator.
  u1 := greatest(random(), 1e-12); u2 := random();
  n1 := sqrt(-2 * ln(u1)) * cos(2 * pi() * u2) * noise_sd;
  n2 := sqrt(-2 * ln(u1)) * sin(2 * pi() * u2) * noise_sd;

  hs := greatest(0, round(h_exp + n1))::integer;
  asc_ := greatest(0, round(a_exp + n2))::integer;
  if hs = asc_ then
    -- Overtime: the side with the better raw expectation takes it by three.
    if h_exp + n1 >= a_exp + n2 then hs := hs + 3; else asc_ := asc_ + 3; end if;
  end if;

  -- Narrative from the decisive edge.
  select k into biggest from (values
    ('home_rush', abs(e_hr)), ('home_pass', abs(e_hp)), ('away_rush', abs(e_ar)), ('away_pass', abs(e_ap))
  ) v(k, m) order by m desc limit 1;
  narrative := case
    when hs > asc_ then h_name || ' beat ' || a_name || ' ' || hs || '–' || asc_ || '. '
    else a_name || ' beat ' || h_name || ' ' || asc_ || '–' || hs || '. ' end ||
    case biggest
      when 'home_rush' then case when e_hr > 0 then h_name || '''s ground game ran over ' || a_name || '''s front seven.' else a_name || '''s run defense shut down ' || h_name || '''s ground game.' end
      when 'home_pass' then case when e_hp > 0 then h_name || ' threw it all over ' || a_name || '''s secondary.' else a_name || '''s coverage smothered ' || h_name || '''s passing game.' end
      when 'away_rush' then case when e_ar > 0 then a_name || '''s ground game ran over ' || h_name || '''s front seven.' else h_name || '''s run defense shut down ' || a_name || '''s ground game.' end
      else case when e_ap > 0 then a_name || ' threw it all over ' || h_name || '''s secondary.' else h_name || '''s coverage smothered ' || a_name || '''s passing game.' end
    end;

  update public.games set
    status = 'resolved',
    resolved_at = now(),
    seed = v_seed,
    inputs = jsonb_build_object(
      'home', jsonb_build_object('program_id', g.home_program_id, 'name', h_name, 'emphasis', h.emphasis_id, 'total', h.total,
                                 'rushing', h.rushing, 'passing', h.passing, 'run_defense', h.run_defense, 'pass_defense', h.pass_defense),
      'away', jsonb_build_object('program_id', g.away_program_id, 'name', a_name, 'emphasis', a.emphasis_id, 'total', a.total,
                                 'rushing', a.rushing, 'passing', a.passing, 'run_defense', a.run_defense, 'pass_defense', a.pass_defense),
      'config', jsonb_build_object('points_per_edge', ppe, 'base_points', base_pts, 'noise_sd', noise_sd)),
    result = jsonb_build_object(
      'home_score', hs, 'away_score', asc_,
      'winner_program_id', case when hs > asc_ then g.home_program_id else g.away_program_id end,
      'edges', jsonb_build_object('home_rush', round(e_hr, 3), 'home_pass', round(e_hp, 3), 'away_rush', round(e_ar, 3), 'away_pass', round(e_ap, 3)),
      'decisive', biggest,
      'narrative', narrative)
  where id = p_game_id;
end;
$$;
revoke execute on function public.resolve_game(uuid) from public, anon, authenticated;

-- Resolve everything that is due. Idempotent; safe for anyone to call.
create or replace function public.resolve_due_games()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n integer := 0;
begin
  for r in select id from public.games where status = 'scheduled' and locks_at <= now() order by locks_at loop
    perform public.resolve_game(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.resolve_due_games() from public;
grant execute on function public.resolve_due_games() to anon, authenticated;

-- Replay: recompute a resolved game from its stored seed and inputs and
-- report whether the score matches. Support tooling.
create or replace function public.replay_game(p_game_id uuid)
returns table (home_score integer, away_score integer, matches boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  g record; i jsonb; c jsonb;
  e_hr numeric; e_hp numeric; e_ar numeric; e_ap numeric;
  h_exp numeric; a_exp numeric; u1 double precision; u2 double precision; n1 numeric; n2 numeric;
  hs integer; asc_ integer;
begin
  select * into g from public.games where id = p_game_id;
  if g.status <> 'resolved' then raise exception 'not resolved'; end if;
  i := g.inputs; c := i -> 'config';
  perform setseed(g.seed);
  e_hr := ((i #>> '{home,rushing}')::numeric - (i #>> '{away,run_defense}')::numeric) / nullif((i #>> '{home,rushing}')::numeric + (i #>> '{away,run_defense}')::numeric, 0);
  e_hp := ((i #>> '{home,passing}')::numeric - (i #>> '{away,pass_defense}')::numeric) / nullif((i #>> '{home,passing}')::numeric + (i #>> '{away,pass_defense}')::numeric, 0);
  e_ar := ((i #>> '{away,rushing}')::numeric - (i #>> '{home,run_defense}')::numeric) / nullif((i #>> '{away,rushing}')::numeric + (i #>> '{home,run_defense}')::numeric, 0);
  e_ap := ((i #>> '{away,passing}')::numeric - (i #>> '{home,pass_defense}')::numeric) / nullif((i #>> '{away,passing}')::numeric + (i #>> '{home,pass_defense}')::numeric, 0);
  h_exp := (c ->> 'base_points')::numeric + (c ->> 'points_per_edge')::numeric * (coalesce(e_hr, 0) + coalesce(e_hp, 0));
  a_exp := (c ->> 'base_points')::numeric + (c ->> 'points_per_edge')::numeric * (coalesce(e_ar, 0) + coalesce(e_ap, 0));
  u1 := greatest(random(), 1e-12); u2 := random();
  n1 := sqrt(-2 * ln(u1)) * cos(2 * pi() * u2) * (c ->> 'noise_sd')::numeric;
  n2 := sqrt(-2 * ln(u1)) * sin(2 * pi() * u2) * (c ->> 'noise_sd')::numeric;
  hs := greatest(0, round(h_exp + n1))::integer; asc_ := greatest(0, round(a_exp + n2))::integer;
  if hs = asc_ then if h_exp + n1 >= a_exp + n2 then hs := hs + 3; else asc_ := asc_ + 3; end if; end if;
  return query select hs, asc_, hs = (g.result ->> 'home_score')::int and asc_ = (g.result ->> 'away_score')::int;
end;
$$;
revoke execute on function public.replay_game(uuid) from public, anon, authenticated;

-- Maintenance entry point for the cron: resolve due games, sweep dormancy.
create or replace function public.run_maintenance()
returns table (games_resolved integer, seats_swept integer)
language sql
security definer
set search_path = public
as $$
  select public.resolve_due_games(), public.sweep_dormant_seats();
$$;
revoke execute on function public.run_maintenance() from public;
grant execute on function public.run_maintenance() to anon, authenticated;
