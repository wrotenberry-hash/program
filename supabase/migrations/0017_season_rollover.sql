-- 0017_season_rollover
-- Season state machine, League settling, offseason display. Design:
-- docs/phase-5/season-rollover.md. Additive columns only.

alter table public.seasons add column if not exists activated_at timestamptz;
alter table public.seasons add column if not exists completed_at timestamptz;

create or replace function public.advance_season(p_today date default current_date)
returns table (completed_season text, activated_season text, leagues_settled integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_done text;
  v_act text;
  v_settled integer := 0;
  v_open integer := public.config_int('LEAGUE_OPEN_SEASONS', 1);
begin
  perform pg_advisory_xact_lock(hashtext('advance_season'));

  for s in select * from public.seasons where status = 'active' and ends_on < p_today order by year loop
    perform public.refresh_standings(s.id);
    update public.seasons set status = 'complete', completed_at = now() where id = s.id;
    v_done := s.id;
  end loop;

  if v_done is not null then
    update public.leagues l set settled_at = now()
    where l.settled_at is null
      and (select count(*) from public.seasons x where x.status = 'complete' and x.starts_on >= l.opened_at::date) >= v_open;
    get diagnostics v_settled = row_count;
  end if;

  if not exists (select 1 from public.seasons where status = 'active') then
    update public.seasons set status = 'active', activated_at = now()
    where id = (select id from public.seasons where status = 'upcoming' and starts_on <= p_today order by starts_on limit 1)
    returning id into v_act;
  end if;

  return query select v_done, v_act, v_settled;
end;
$$;
revoke execute on function public.advance_season(date) from public, anon, authenticated;

-- What season the screens should show: the active one with its current week,
-- otherwise the most recently completed one (offseason). next_* says what is
-- coming.
create or replace function public.season_display()
returns table (season_id text, year smallint, status text, week_number smallint, week_kind text,
               next_season_id text, next_starts_on date)
language sql
stable
set search_path = public
as $$
  with cur as (
    select s.id, s.year, s.status, w.week_number, w.kind
    from public.seasons s
    left join lateral (
      select week_number, kind from public.season_weeks w
      where w.season_id = s.id and w.starts_on <= current_date
      order by week_number desc limit 1
    ) w on true
    where s.status = 'active'
    limit 1
  ),
  last_done as (
    select s.id, s.year, s.status, null::smallint as week_number, null::text as kind
    from public.seasons s where s.status = 'complete' order by s.year desc limit 1
  ),
  pick as (
    select * from cur where week_number is not null
    union all
    select * from last_done where not exists (select 1 from cur where week_number is not null)
  ),
  nxt as (
    select id, starts_on from public.seasons where status = 'upcoming' order by starts_on limit 1
  )
  select p.id, p.year, p.status, p.week_number, p.kind, (select id from nxt), (select starts_on from nxt)
  from pick p
  union all
  select null, null, 'none', null, null, (select id from nxt), (select starts_on from nxt)
  where not exists (select 1 from pick);
$$;
grant execute on function public.season_display() to anon, authenticated;

-- Maintenance: resolve, refresh, advance the season, schedule, sweep.
create or replace function public.run_maintenance()
returns table (games_scheduled integer, games_resolved integer, seats_swept integer)
language plpgsql
security definer
set search_path = public
as $$
declare s integer; r integer; d integer; w record;
begin
  r := public.resolve_due_games();
  select * into w from public.current_week();
  if w.season_id is not null and r > 0 then perform public.refresh_standings(w.season_id); end if;
  perform public.advance_season();
  s := public.schedule_current_week();
  d := public.sweep_dormant_seats();
  return query select s, r, d;
end;
$$;
revoke execute on function public.run_maintenance() from public;
grant execute on function public.run_maintenance() to anon, authenticated;
