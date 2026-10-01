-- 0019_faction_goals
-- Weekly faction goal with a shared reward, and the officer role. The leader
-- promotes and demotes officers (up to OFFICER_COUNT); the leader or an
-- officer picks the week's goal; when the faction reaches it, every active
-- member claims the same fixed reward. Progress is derived from games.
-- Gated in the database by FEATURE_FACTION_GOALS (0 = off) and in the app by
-- FLAG_FACTION_GOALS.

create table public.faction_goal_types (
  id           text primary key,
  label        text not null,
  blurb        text not null,
  metric       text not null check (metric in ('league_wins', 'league_games', 'challenges')),
  per_member   numeric(5,2) not null check (per_member > 0),
  min_target   integer not null check (min_target > 0),
  reward_cash  integer not null check (reward_cash >= 0),
  enabled      boolean not null default true,
  sort_order   smallint not null default 100
);

create table public.faction_weekly_goals (
  faction_id    uuid not null references public.factions (id) on delete cascade,
  season_id     text not null references public.seasons (id),
  week_number   smallint not null,
  goal_type_id  text not null references public.faction_goal_types (id),
  target        integer not null check (target > 0),
  set_by        uuid references public.programs (id) on delete set null,
  set_at        timestamptz not null default now(),
  primary key (faction_id, season_id, week_number)
);

create table public.faction_goal_claims (
  faction_id   uuid not null references public.factions (id) on delete cascade,
  season_id    text not null references public.seasons (id),
  week_number  smallint not null,
  program_id   uuid not null references public.programs (id) on delete cascade,
  reward       integer not null,
  claimed_at   timestamptz not null default now(),
  primary key (faction_id, season_id, week_number, program_id)
);

alter table public.faction_goal_types   enable row level security;
alter table public.faction_weekly_goals enable row level security;
alter table public.faction_goal_claims  enable row level security;
create policy "goal types are public" on public.faction_goal_types for select to anon, authenticated using (true);
create policy "members read their faction goal" on public.faction_weekly_goals for select to authenticated
  using (public.is_faction_member(faction_id));
create policy "read own goal claims" on public.faction_goal_claims for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));

create or replace function public.faction_goals_enabled()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.config_int('FEATURE_FACTION_GOALS', 0) = 1;
$$;

-- The caller's active seat.
create or replace function public.my_seat()
returns table (program_id uuid, faction_id uuid, league_id uuid, role text)
language sql
stable
security definer
set search_path = public
as $$
  select s.program_id, s.faction_id, s.league_id, s.role
  from public.league_seats s join public.programs p on p.id = s.program_id
  where p.account_id = auth.uid() and s.status = 'active'
  limit 1;
$$;
revoke execute on function public.my_seat() from public, anon;
grant execute on function public.my_seat() to authenticated;

-- Progress toward a metric for a faction in a season week.
create or replace function public.faction_goal_progress(p_faction_id uuid, p_season text, p_week smallint, p_metric text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_from date; v_to date; v_n integer;
begin
  select starts_on into v_from from public.season_weeks where season_id = p_season and week_number = p_week;
  select starts_on into v_to from public.season_weeks where season_id = p_season and week_number = p_week + 1;
  v_to := coalesce(v_to, v_from + 7);
  if p_metric in ('league_wins', 'league_games') then
    select count(*) into v_n
    from public.games g
    cross join lateral (values (g.home_program_id, g.home_faction_id), (g.away_program_id, g.away_faction_id)) x(program_id, faction_id)
    where g.season_id = p_season and g.week_number = p_week and g.kind in ('conference', 'rivalry')
      and g.status = 'resolved' and g.voided_at is null and x.faction_id = p_faction_id
      and (p_metric = 'league_games' or (g.result ->> 'winner_program_id')::uuid = x.program_id);
  else
    select count(*) into v_n
    from public.games g
    where g.kind = 'challenge' and g.voided_at is null
      and g.created_at >= v_from and g.created_at < v_to
      and exists (select 1 from public.league_seats s where s.faction_id = p_faction_id and s.status = 'active'
                  and s.program_id in (g.home_program_id, g.away_program_id));
  end if;
  return coalesce(v_n, 0);
end;
$$;
revoke execute on function public.faction_goal_progress(uuid, text, smallint, text) from public, anon, authenticated;

create or replace function public.faction_goal_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me record; w record; g record; t record; v_progress integer; v_members integer; v_officers integer;
begin
  select * into me from public.my_seat();
  if me.faction_id is null then return jsonb_build_object('enabled', public.faction_goals_enabled(), 'seated', false); end if;
  select * into w from public.current_week();
  select count(*) into v_members from public.league_seats where faction_id = me.faction_id and status = 'active';
  select count(*) into v_officers from public.league_seats where faction_id = me.faction_id and status = 'active' and role = 'officer';
  if w.season_id is not null then
    select * into g from public.faction_weekly_goals where faction_id = me.faction_id and season_id = w.season_id and week_number = w.week_number;
  end if;
  if g.goal_type_id is not null then
    select * into t from public.faction_goal_types where id = g.goal_type_id;
    v_progress := public.faction_goal_progress(me.faction_id, w.season_id, w.week_number, t.metric);
  end if;
  return jsonb_build_object(
    'enabled', public.faction_goals_enabled(),
    'seated', true,
    'role', me.role,
    'can_set', me.role in ('leader', 'officer'),
    'officers', v_officers,
    'officer_cap', public.config_int('OFFICER_COUNT', 5),
    'members', v_members,
    'week', case when w.season_id is null then null else jsonb_build_object('season_id', w.season_id, 'week_number', w.week_number) end,
    'goal', case when g.goal_type_id is null then null else jsonb_build_object(
      'type_id', t.id, 'label', t.label, 'blurb', t.blurb, 'target', g.target, 'reward', t.reward_cash,
      'progress', v_progress, 'met', v_progress >= g.target,
      'claimed', exists (select 1 from public.faction_goal_claims c where c.faction_id = me.faction_id and c.season_id = w.season_id and c.week_number = w.week_number and c.program_id = me.program_id),
      'locked', v_progress > 0) end,
    'types', (select jsonb_agg(jsonb_build_object('id', x.id, 'label', x.label, 'blurb', x.blurb, 'reward', x.reward_cash,
                'target', greatest(x.min_target, ceil(v_members * x.per_member)::int)) order by x.sort_order)
              from public.faction_goal_types x where x.enabled));
end;
$$;
revoke execute on function public.faction_goal_status() from public, anon;
grant execute on function public.faction_goal_status() to authenticated;

create or replace function public.set_faction_goal(p_goal_type_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me record; w record; t record; v_members integer; g record;
begin
  if not public.faction_goals_enabled() then raise exception 'faction goals are not available yet'; end if;
  select * into me from public.my_seat();
  if me.faction_id is null then raise exception 'join a faction first'; end if;
  if me.role not in ('leader', 'officer') then raise exception 'only the founder or an officer can set the goal'; end if;
  select * into w from public.current_week();
  if w.season_id is null then raise exception 'goals run during the season'; end if;
  select * into t from public.faction_goal_types where id = p_goal_type_id and enabled;
  if t.id is null then raise exception 'unknown goal'; end if;
  select * into g from public.faction_weekly_goals where faction_id = me.faction_id and season_id = w.season_id and week_number = w.week_number;
  if g.goal_type_id is not null and public.faction_goal_progress(me.faction_id, w.season_id, w.week_number,
       (select metric from public.faction_goal_types where id = g.goal_type_id)) > 0 then
    raise exception 'this week''s goal is locked in once progress starts';
  end if;
  select count(*) into v_members from public.league_seats where faction_id = me.faction_id and status = 'active';
  insert into public.faction_weekly_goals (faction_id, season_id, week_number, goal_type_id, target, set_by)
  values (me.faction_id, w.season_id, w.week_number, t.id, greatest(t.min_target, ceil(v_members * t.per_member)::int), me.program_id)
  on conflict (faction_id, season_id, week_number) do update
    set goal_type_id = excluded.goal_type_id, target = excluded.target, set_by = excluded.set_by, set_at = now();
  perform public.touch_activity(me.program_id);
end;
$$;
revoke execute on function public.set_faction_goal(text) from public, anon;
grant execute on function public.set_faction_goal(text) to authenticated;

create or replace function public.claim_faction_goal()
returns table (reward integer, cash bigint)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare me record; w record; g record; t record; v_cash bigint;
begin
  if not public.faction_goals_enabled() then raise exception 'faction goals are not available yet'; end if;
  select * into me from public.my_seat();
  if me.faction_id is null then raise exception 'join a faction first'; end if;
  select * into w from public.current_week();
  select * into g from public.faction_weekly_goals where faction_id = me.faction_id and season_id = w.season_id and week_number = w.week_number;
  if g.goal_type_id is null then raise exception 'no goal set this week'; end if;
  select * into t from public.faction_goal_types where id = g.goal_type_id;
  if public.faction_goal_progress(me.faction_id, w.season_id, w.week_number, t.metric) < g.target then raise exception 'the faction has not reached the goal yet'; end if;
  insert into public.faction_goal_claims (faction_id, season_id, week_number, program_id, reward)
  values (me.faction_id, w.season_id, w.week_number, me.program_id, t.reward_cash)
  on conflict do nothing;
  if not found then raise exception 'already claimed'; end if;
  update public.program_treasury tr set cash = tr.cash + t.reward_cash where tr.program_id = me.program_id returning tr.cash into v_cash;
  perform public.touch_activity(me.program_id);
  return query select t.reward_cash, v_cash;
end;
$$;
revoke execute on function public.claim_faction_goal() from public, anon;
grant execute on function public.claim_faction_goal() to authenticated;

-- Officer role: the faction's leader promotes or demotes a member.
create or replace function public.set_faction_role(p_program_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare me record; v_target record; v_officers integer;
begin
  if not public.faction_goals_enabled() then raise exception 'officers are not available yet'; end if;
  if p_role not in ('member', 'officer') then raise exception 'role must be member or officer'; end if;
  select * into me from public.my_seat();
  if me.role is distinct from 'leader' then raise exception 'only the founder can change roles'; end if;
  select * into v_target from public.league_seats where program_id = p_program_id and faction_id = me.faction_id and status = 'active';
  if v_target.program_id is null then raise exception 'that fan is not in your faction'; end if;
  if v_target.role = 'leader' then raise exception 'the founder''s role cannot change'; end if;
  if p_role = 'officer' and v_target.role <> 'officer' then
    select count(*) into v_officers from public.league_seats where faction_id = me.faction_id and status = 'active' and role = 'officer';
    if v_officers >= public.config_int('OFFICER_COUNT', 5) then raise exception 'officer slots are full'; end if;
  end if;
  update public.league_seats set role = p_role where program_id = p_program_id and faction_id = me.faction_id and status = 'active';
end;
$$;
revoke execute on function public.set_faction_role(uuid, text) from public, anon;
grant execute on function public.set_faction_role(uuid, text) to authenticated;

insert into public.game_config (key, value, description) values
  ('FEATURE_FACTION_GOALS', '0'::jsonb, 'Weekly faction goal, shared reward, officer role. 0 = off. Founder approves before turning on in production.')
on conflict (key) do nothing;
