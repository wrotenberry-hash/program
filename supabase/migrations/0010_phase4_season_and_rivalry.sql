-- 0010_phase4_season_and_rivalry
-- The weekly League schedule, house programs as opponents, faction standings,
-- Conference Rivalry Week with trophies, the Nation roll-up, and orphaned
-- rivalry matching across Leagues. Design: docs/phase-0/sharding-and-rivalry.md §7.

-- ---------------------------------------------------------------------------
-- House programs become real program rows so the resolver treats them alike.
-- ---------------------------------------------------------------------------

alter table public.programs add column if not exists is_house boolean not null default false;
alter table public.house_programs add column if not exists program_id uuid references public.programs (id);

-- Games remember which factions they were between, for standings and brackets.
alter table public.games add column if not exists home_faction_id uuid references public.factions (id);
alter table public.games add column if not exists away_faction_id uuid references public.factions (id);
create index if not exists games_league_week_idx on public.games (league_id, season_id, week_number);
create index if not exists games_season_week_idx on public.games (season_id, week_number) where kind <> 'challenge';

-- The init trigger must not place or fund house programs.
create or replace function public.init_program()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_house then return new; end if;

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

-- Ensure a house program row exists for (league, school) and return its program id.
create or replace function public.house_program_for(p_league_id uuid, p_school_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_program uuid;
begin
  select program_id into v_program from public.house_programs where league_id = p_league_id and school_id = p_school_id;
  if v_program is not null then return v_program; end if;
  -- A house row may have been deleted when a faction formed; find or create the program.
  select p.id into v_program from public.programs p
  where p.is_house and p.school_id = p_school_id
    and exists (select 1 from public.house_programs h where h.program_id = p.id and h.league_id = p_league_id);
  if v_program is null then
    insert into public.programs (school_id, name, is_house, emphasis_id)
    select p_school_id, s.name || ' ' || s.nickname, true, 'balanced' from public.schools s where s.id = p_school_id
    returning id into v_program;
  end if;
  insert into public.house_programs (league_id, school_id, program_id) values (p_league_id, p_school_id, v_program)
  on conflict (league_id, school_id) do update set program_id = excluded.program_id;
  return v_program;
end;
$$;
revoke execute on function public.house_program_for(uuid, text) from public, anon, authenticated;

-- Backfill program rows for existing house slots.
do $$
declare r record;
begin
  for r in select league_id, school_id from public.house_programs where program_id is null loop
    perform public.house_program_for(r.league_id, r.school_id);
  end loop;
end $$;

-- Placement: new Leagues get house program rows; a forming faction no longer
-- deletes the house row (the house still fills gaps when the faction is small).
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
  r record;
begin
  select school_id into v_school from public.programs where id = p_program_id and not is_house;
  if v_school is null then raise exception 'program % not found', p_program_id; end if;
  select conference_id into v_conf from public.schools where id = v_school;

  select league_id into v_league from public.league_seats where program_id = p_program_id and status = 'active';
  if v_league is not null then return v_league; end if;

  perform pg_advisory_xact_lock(hashtext('place:' || v_conf));
  v_cap := public.config_int('FACTION_CAP', 100);

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
    for r in select id from public.schools where conference_id = v_conf loop
      perform public.house_program_for(v_league, r.id);
    end loop;
  end if;

  select id into v_faction from public.factions where league_id = v_league and school_id = v_school;
  if v_faction is null then
    insert into public.factions (league_id, school_id, name)
    select v_league, v_school, s.name || ' ' || s.nickname from public.schools s where s.id = v_school
    returning id into v_faction;
    v_role := 'leader';
  end if;

  insert into public.league_seats (program_id, league_id, faction_id, role)
  values (p_program_id, v_league, v_faction, v_role);
  return v_league;
end;
$$;

-- House programs have a flat baseline power, split evenly.
create or replace function public.facet_powers(p_program_id uuid)
returns table (rushing numeric, passing numeric, run_defense numeric, pass_defense numeric, total integer)
language sql
stable
security definer
set search_path = public
as $$
  with house as (
    select public.config_int('HOUSE_BASE_POWER', 300) as base
    from public.programs p where p.id = p_program_id and p.is_house
  ),
  fac as (
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
    union all
    select base, 0.25, 0.25, 0.25, 0.25 from house
  )
  select coalesce(sum(power * r), 0), coalesce(sum(power * p), 0), coalesce(sum(power * rd), 0), coalesce(sum(power * pd), 0), coalesce(sum(power), 0)::integer
  from allrows;
$$;

-- ---------------------------------------------------------------------------
-- Standings, trophies, Nation
-- ---------------------------------------------------------------------------

create table public.faction_standings (
  season_id   text not null references public.seasons (id),
  faction_id  uuid not null references public.factions (id) on delete cascade,
  league_id   uuid not null references public.leagues (id) on delete cascade,
  wins        integer not null default 0,
  losses      integer not null default 0,
  points      integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (season_id, faction_id)
);
create index faction_standings_league_idx on public.faction_standings (season_id, league_id, points desc);

create table public.faction_trophies (
  id                    uuid primary key default gen_random_uuid(),
  season_id             text not null references public.seasons (id),
  week_number           smallint not null,
  kind                  text not null check (kind in ('rivalry')),
  faction_id            uuid not null references public.factions (id) on delete cascade,
  opponent_faction_id   uuid references public.factions (id) on delete set null,
  faction_points        integer not null,
  opponent_points       integer not null,
  awarded_at            timestamptz not null default now(),
  unique (season_id, week_number, kind, faction_id)
);

create table public.nation_ledger (
  season_id    text not null references public.seasons (id),
  school_id    text not null references public.schools (id),
  week_number  smallint not null,
  wins         integer not null default 0,
  losses       integer not null default 0,
  points       integer not null default 0,
  primary key (season_id, school_id, week_number)
);

alter table public.faction_standings enable row level security;
alter table public.faction_trophies  enable row level security;
alter table public.nation_ledger     enable row level security;
create policy "standings readable when signed in" on public.faction_standings for select to authenticated using (true);
create policy "trophies readable when signed in"  on public.faction_trophies  for select to authenticated using (true);
create policy "nation ledger is public"           on public.nation_ledger     for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------

-- Deterministic ordering of a faction's active human programs for a week.
create or replace function public.faction_lineup(p_faction_id uuid, p_salt text)
returns uuid[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(s.program_id order by md5(s.program_id::text || p_salt)), '{}'::uuid[])
  from public.league_seats s where s.faction_id = p_faction_id and s.status = 'active';
$$;

-- Insert the games for a school pair inside one League (or across two, for
-- the orphan pool). Humans zip against humans; leftovers play the house.
create or replace function public.schedule_pair(
  p_season text, p_week smallint, p_kind text, p_locks_at timestamptz,
  p_league_a uuid, p_school_a text, p_league_b uuid, p_school_b text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  fa uuid; fb uuid; la uuid[]; lb uuid[]; m integer; i integer; n integer := 0;
  house_a uuid; house_b uuid; league_for_game uuid;
begin
  select id into fa from public.factions where league_id = p_league_a and school_id = p_school_a;
  select id into fb from public.factions where league_id = p_league_b and school_id = p_school_b;
  la := case when fa is null then '{}'::uuid[] else public.faction_lineup(fa, p_season || p_week::text) end;
  lb := case when fb is null then '{}'::uuid[] else public.faction_lineup(fb, p_season || p_week::text) end;
  league_for_game := case when p_league_a = p_league_b then p_league_a else null end;
  m := least(coalesce(array_length(la, 1), 0), coalesce(array_length(lb, 1), 0));

  for i in 1..m loop
    insert into public.games (season_id, week_number, league_id, kind, home_program_id, away_program_id, home_faction_id, away_faction_id, locks_at)
    values (p_season, p_week, league_for_game, p_kind,
            case when i % 2 = 1 then la[i] else lb[i] end, case when i % 2 = 1 then lb[i] else la[i] end,
            case when i % 2 = 1 then fa else fb end, case when i % 2 = 1 then fb else fa end, p_locks_at);
    n := n + 1;
  end loop;

  if coalesce(array_length(la, 1), 0) > m then
    house_b := public.house_program_for(p_league_a, p_school_b);
    for i in (m + 1)..array_length(la, 1) loop
      insert into public.games (season_id, week_number, league_id, kind, home_program_id, away_program_id, home_faction_id, away_faction_id, locks_at)
      values (p_season, p_week, p_league_a, p_kind, la[i], house_b, fa, null, p_locks_at);
      n := n + 1;
    end loop;
  end if;
  if coalesce(array_length(lb, 1), 0) > m then
    house_a := public.house_program_for(p_league_b, p_school_a);
    for i in (m + 1)..array_length(lb, 1) loop
      insert into public.games (season_id, week_number, league_id, kind, home_program_id, away_program_id, home_faction_id, away_faction_id, locks_at)
      values (p_season, p_week, p_league_b, p_kind, lb[i], house_a, fb, null, p_locks_at);
      n := n + 1;
    end loop;
  end if;
  return n;
end;
$$;
revoke execute on function public.schedule_pair(text, smallint, text, timestamptz, uuid, text, uuid, text) from public, anon, authenticated;

-- One League, one week. Idempotent: does nothing if the League already has
-- games that week. Conference weeks use a round robin; Rivalry Week pairs
-- primary rivals, matches orphaned factions across Leagues, and round-robins
-- the rest.
create or replace function public.schedule_league_week(p_league_id uuid, p_season text, p_week smallint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conf text; v_kind text; v_locks timestamptz; v_week_locks timestamptz;
  schools text[]; n integer; rounds integer; r integer; i integer;
  lst text[]; a text; b text; total integer := 0;
  paired text[] := '{}';
  rv record; other_league uuid;
begin
  if exists (select 1 from public.games g where g.league_id = p_league_id and g.season_id = p_season and g.week_number = p_week and g.kind <> 'challenge') then
    return 0;
  end if;
  select w.kind, w.locks_at into v_kind, v_week_locks from public.season_weeks w where w.season_id = p_season and w.week_number = p_week;
  if v_kind is null or v_kind = 'nonconference' or v_kind = 'championship' then return 0; end if;
  v_locks := greatest(v_week_locks, now() + make_interval(mins => public.config_int('CHALLENGE_LOCK_MINUTES', 10)));
  select conference_id into v_conf from public.leagues where id = p_league_id;
  perform pg_advisory_xact_lock(hashtext('schedule:' || p_league_id::text));

  if v_kind = 'rivalry' then
    -- Primary rivals inside the conference, each pair once.
    for rv in
      select rp.school_id as s, rp.rival_school_id as t
      from public.rivalry_pairings rp
      join public.schools s1 on s1.id = rp.school_id and s1.conference_id = v_conf
      join public.schools s2 on s2.id = rp.rival_school_id and s2.conference_id = v_conf
      where rp.rank = 1 and rp.school_id < rp.rival_school_id
        and not exists (select 1 from public.rivalry_pairings rp2 where rp2.school_id = rp.rival_school_id and rp2.rank = 1 and rp2.rival_school_id <> rp.school_id
                        and exists (select 1 from public.schools s3 where s3.id = rp2.rival_school_id and s3.conference_id = v_conf))
    loop
      if rv.s = any(paired) or rv.t = any(paired) then continue; end if;
      -- Orphan pool: this League has a faction for one side but not the other.
      if exists (select 1 from public.factions f where f.league_id = p_league_id and f.school_id = rv.s)
         and not exists (select 1 from public.factions f where f.league_id = p_league_id and f.school_id = rv.t) then
        select l2.id into other_league from public.leagues l2
        where l2.conference_id = v_conf and l2.id <> p_league_id
          and exists (select 1 from public.factions f where f.league_id = l2.id and f.school_id = rv.t)
          and not exists (select 1 from public.factions f where f.league_id = l2.id and f.school_id = rv.s)
          and not exists (select 1 from public.games g join public.factions f on f.id in (g.home_faction_id, g.away_faction_id)
                          where f.league_id = l2.id and f.school_id = rv.t and g.season_id = p_season and g.week_number = p_week and g.kind = 'rivalry')
        order by l2.number limit 1;
        if other_league is not null then
          total := total + public.schedule_pair(p_season, p_week, 'rivalry', v_locks, p_league_id, rv.s, other_league, rv.t);
          paired := paired || rv.s || rv.t; continue;
        end if;
      elsif exists (select 1 from public.factions f where f.league_id = p_league_id and f.school_id = rv.t)
         and not exists (select 1 from public.factions f where f.league_id = p_league_id and f.school_id = rv.s) then
        select l2.id into other_league from public.leagues l2
        where l2.conference_id = v_conf and l2.id <> p_league_id
          and exists (select 1 from public.factions f where f.league_id = l2.id and f.school_id = rv.s)
          and not exists (select 1 from public.factions f where f.league_id = l2.id and f.school_id = rv.t)
          and not exists (select 1 from public.games g join public.factions f on f.id in (g.home_faction_id, g.away_faction_id)
                          where f.league_id = l2.id and f.school_id = rv.s and g.season_id = p_season and g.week_number = p_week and g.kind = 'rivalry')
        order by l2.number limit 1;
        if other_league is not null then
          total := total + public.schedule_pair(p_season, p_week, 'rivalry', v_locks, p_league_id, rv.t, other_league, rv.s);
          paired := paired || rv.s || rv.t; continue;
        end if;
      end if;
      total := total + public.schedule_pair(p_season, p_week, 'rivalry', v_locks, p_league_id, rv.s, p_league_id, rv.t);
      paired := paired || rv.s || rv.t;
    end loop;
    -- Everyone else this week: round robin among the unpaired.
    schools := array(select id from public.schools where conference_id = v_conf and not (id = any(paired)) order by id);
  else
    schools := array(select id from public.schools where conference_id = v_conf order by id);
  end if;

  n := coalesce(array_length(schools, 1), 0);
  if n < 2 then return total; end if;
  if n % 2 = 1 then schools := schools || null::text; n := n + 1; end if;
  rounds := n - 1;
  r := (p_week % rounds);
  -- Circle method: fix schools[1], rotate the rest by r.
  lst := array[schools[1]];
  for i in 0..(n - 2) loop
    lst := lst || schools[2 + ((i + r) % (n - 1))];
  end loop;
  for i in 1..(n / 2) loop
    a := lst[i]; b := lst[n + 1 - i];
    if a is null or b is null then continue; end if;
    total := total + public.schedule_pair(p_season, p_week, case when v_kind = 'rivalry' then 'rivalry' else 'conference' end, v_locks, p_league_id, a, p_league_id, b);
  end loop;
  return total;
end;
$$;
revoke execute on function public.schedule_league_week(uuid, text, smallint) from public, anon, authenticated;

-- Schedule the current week for every League. Called by maintenance.
create or replace function public.schedule_current_week()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare w record; l record; n integer := 0;
begin
  select * into w from public.current_week();
  if w.season_id is null then return 0; end if;
  for l in select id from public.leagues order by conference_id, number loop
    n := n + public.schedule_league_week(l.id, w.season_id, w.week_number);
  end loop;
  return n;
end;
$$;
revoke execute on function public.schedule_current_week() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Standings refresh: idempotent recompute from resolved League games.
-- ---------------------------------------------------------------------------

create or replace function public.refresh_standings(p_season text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_topn integer := public.config_int('FACTION_SCORING_N', 50);
        v_win_pts integer := public.config_int('WIN_POINTS', 3);
        v_loss_pts integer := public.config_int('LOSS_POINTS', 1);
        t record;
begin
  -- Per human program per game: points.
  create temp table pg on commit drop as
  select g.week_number, g.kind,
         x.program_id, x.faction_id, p.school_id,
         (x.program_id = (g.result ->> 'winner_program_id')::uuid) as won
  from public.games g
  cross join lateral (values (g.home_program_id, g.home_faction_id), (g.away_program_id, g.away_faction_id)) as x(program_id, faction_id)
  join public.programs p on p.id = x.program_id
  where g.season_id = p_season and g.status = 'resolved' and g.kind <> 'challenge' and not p.is_house;

  -- Faction standings: wins, losses, and points = sum over weeks of top-N program points.
  delete from public.faction_standings where season_id = p_season;
  insert into public.faction_standings (season_id, faction_id, league_id, wins, losses, points)
  select p_season, f.id, f.league_id,
         coalesce(sum(case when pg.won then 1 else 0 end), 0),
         coalesce(sum(case when pg.won then 0 else 1 end), 0),
         coalesce((
           select sum(pts) from (
             select r.pts, row_number() over (partition by r.week_number order by r.pts desc) as rn
             from (select pg2.week_number, case when pg2.won then v_win_pts else v_loss_pts end as pts from pg pg2 where pg2.faction_id = f.id) r
           ) ranked where rn <= v_topn
         ), 0)
  from public.factions f
  left join pg on pg.faction_id = f.id
  group by f.id, f.league_id;

  -- Nation ledger: every school, every week, across all Leagues.
  delete from public.nation_ledger where season_id = p_season;
  insert into public.nation_ledger (season_id, school_id, week_number, wins, losses, points)
  select p_season, school_id, week_number,
         sum(case when won then 1 else 0 end), sum(case when won then 0 else 1 end),
         sum(case when won then v_win_pts else v_loss_pts end)
  from pg group by school_id, week_number;

  -- Rivalry trophies: for each rivalry-week faction pairing where every game is resolved,
  -- the faction with more points that week takes the trophy.
  for t in
    select g.week_number, g.home_faction_id as fa, g.away_faction_id as fb
    from public.games g
    where g.season_id = p_season and g.kind = 'rivalry' and g.home_faction_id is not null and g.away_faction_id is not null
    group by g.week_number, g.home_faction_id, g.away_faction_id
    having bool_and(g.status = 'resolved')
  loop
    declare pa integer; pb integer; begin
      select coalesce(sum(case when won then v_win_pts else v_loss_pts end), 0) into pa from pg where faction_id = t.fa and week_number = t.week_number and kind = 'rivalry';
      select coalesce(sum(case when won then v_win_pts else v_loss_pts end), 0) into pb from pg where faction_id = t.fb and week_number = t.week_number and kind = 'rivalry';
      if pa <> pb then
        insert into public.faction_trophies (season_id, week_number, kind, faction_id, opponent_faction_id, faction_points, opponent_points)
        values (p_season, t.week_number, 'rivalry', case when pa > pb then t.fa else t.fb end, case when pa > pb then t.fb else t.fa end, greatest(pa, pb), least(pa, pb))
        on conflict (season_id, week_number, kind, faction_id) do nothing;
      end if;
    end;
  end loop;
  drop table if exists pg;
end;
$$;
revoke execute on function public.refresh_standings(text) from public, anon, authenticated;

-- Maintenance: schedule, resolve, standings, dormancy. The return type changes, so drop first.
drop function if exists public.run_maintenance();
create or replace function public.run_maintenance()
returns table (games_scheduled integer, games_resolved integer, seats_swept integer)
language plpgsql
security definer
set search_path = public
as $$
declare s integer; r integer; d integer; w record;
begin
  s := public.schedule_current_week();
  r := public.resolve_due_games();
  select * into w from public.current_week();
  if w.season_id is not null and r > 0 then perform public.refresh_standings(w.season_id); end if;
  d := public.sweep_dormant_seats();
  return query select s, r, d;
end;
$$;
revoke execute on function public.run_maintenance() from public;
grant execute on function public.run_maintenance() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reads for the League and Nation screens (members only where it matters).
-- ---------------------------------------------------------------------------

create or replace function public.league_week_games(p_league_id uuid, p_season text, p_week smallint)
returns table (
  id uuid, kind text, status text, locks_at timestamptz,
  home_program_id uuid, home_name text, home_school text, home_is_house boolean, home_faction_id uuid,
  away_program_id uuid, away_name text, away_school text, away_is_house boolean, away_faction_id uuid,
  home_score integer, away_score integer, narrative text
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.kind, g.status, g.locks_at,
         g.home_program_id, hp.name, hp.school_id, hp.is_house, g.home_faction_id,
         g.away_program_id, ap.name, ap.school_id, ap.is_house, g.away_faction_id,
         (g.result ->> 'home_score')::int, (g.result ->> 'away_score')::int, g.result ->> 'narrative'
  from public.games g
  join public.programs hp on hp.id = g.home_program_id
  join public.programs ap on ap.id = g.away_program_id
  where g.season_id = p_season and g.week_number = p_week and g.kind <> 'challenge'
    and (g.league_id = p_league_id
         or exists (select 1 from public.factions f where f.league_id = p_league_id and f.id in (g.home_faction_id, g.away_faction_id)))
    and exists (select 1 from public.league_seats s join public.programs me on me.id = s.program_id
                where me.account_id = auth.uid() and s.status = 'active' and s.league_id = p_league_id)
  order by g.kind desc, g.locks_at, g.id;
$$;
revoke execute on function public.league_week_games(uuid, text, smallint) from public, anon;
grant execute on function public.league_week_games(uuid, text, smallint) to authenticated;
