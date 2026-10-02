-- Season-end rewards. docs/phase-5/season-rewards.md
--
-- When advance_season() completes a season it now also:
--   1. records every faction's final place in its League (faction_season_finishes),
--   2. computes each active fan's reward: a bonus by their faction's place (if
--      they played at least one League game), plus a smaller one for playing at
--      least SEASON_REWARD_MIN_GAMES League games.
-- Rewards are fixed amounts from game_config. Nothing is random.
--
-- Rewards are recorded whether or not the feature is on, so turning it on later
-- loses nobody's prize. Claiming is what FEATURE_SEASON_REWARDS gates.

create table public.faction_season_finishes (
  season_id   text not null references public.seasons (id),
  league_id   uuid not null references public.leagues (id) on delete cascade,
  faction_id  uuid not null references public.factions (id) on delete cascade,
  place       smallint not null check (place > 0),
  wins        integer not null,
  losses      integer not null,
  points      integer not null,
  recorded_at timestamptz not null default now(),
  primary key (season_id, faction_id)
);
create index faction_season_finishes_league_idx on public.faction_season_finishes (season_id, league_id, place);

create table public.program_season_rewards (
  program_id    uuid not null references public.programs (id) on delete cascade,
  season_id     text not null references public.seasons (id),
  faction_id    uuid references public.factions (id) on delete set null,
  place         smallint,
  games_played  integer not null,
  place_cash    integer not null check (place_cash >= 0),
  played_cash   integer not null check (played_cash >= 0),
  granted_at    timestamptz not null default now(),
  claimed_at    timestamptz,
  primary key (program_id, season_id)
);

alter table public.faction_season_finishes enable row level security;
alter table public.program_season_rewards  enable row level security;
-- Final places are the last state of faction_standings, which every signed-in player can already read.
create policy "season finishes readable when signed in" on public.faction_season_finishes for select to authenticated using (true);
create policy "read own season rewards" on public.program_season_rewards for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));

insert into public.game_config (key, value, description) values
  ('FEATURE_SEASON_REWARDS', '0'::jsonb, 'Season-end reward claims. 0 = off. Rewards are still recorded. Founder approves before turning on in production.'),
  ('SEASON_REWARD_PLACES', '[3000, 1500, 750]'::jsonb, 'Cash to every active member of the faction finishing 1st, 2nd, 3rd... in its League'),
  ('SEASON_REWARD_PLAYED', '500'::jsonb, 'Cash to every fan who played at least SEASON_REWARD_MIN_GAMES League games'),
  ('SEASON_REWARD_MIN_GAMES', '3'::jsonb, 'League games (conference or rivalry) needed for the played reward')
on conflict (key) do nothing;

create or replace function public.season_rewards_enabled()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.config_int('FEATURE_SEASON_REWARDS', 0) = 1;
$$;

-- Internal: called by advance_season. Idempotent: a second call adds nothing.
create or replace function public.award_season(p_season_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_places jsonb := coalesce((select value from public.game_config where key = 'SEASON_REWARD_PLACES'), '[]'::jsonb);
  v_played integer := public.config_int('SEASON_REWARD_PLAYED', 0);
  v_min integer := public.config_int('SEASON_REWARD_MIN_GAMES', 3);
  v_n integer;
begin
  -- Ties share a place: rank() by points, then wins.
  insert into public.faction_season_finishes (season_id, league_id, faction_id, place, wins, losses, points)
  select st.season_id, st.league_id, st.faction_id,
         rank() over (partition by st.league_id order by st.points desc, st.wins desc),
         st.wins, st.losses, st.points
  from public.faction_standings st
  where st.season_id = p_season_id
  on conflict (season_id, faction_id) do nothing;

  insert into public.program_season_rewards (program_id, season_id, faction_id, place, games_played, place_cash, played_cash)
  select x.program_id, p_season_id, x.faction_id, x.place, x.games,
         case when x.games >= 1 then coalesce((v_places ->> (x.place - 1))::int, 0) else 0 end,
         case when x.games >= v_min then v_played else 0 end
  from (
    select s.program_id, s.faction_id, f.place,
           (select count(*) from public.games g
            where g.season_id = p_season_id and g.kind in ('conference', 'rivalry')
              and g.status = 'resolved' and g.voided_at is null
              and s.program_id in (g.home_program_id, g.away_program_id))::int as games
    from public.league_seats s
    join public.programs p on p.id = s.program_id and not p.is_house
    left join public.faction_season_finishes f on f.season_id = p_season_id and f.faction_id = s.faction_id
    where s.status = 'active'
  ) x
  where (x.games >= 1 and coalesce((v_places ->> (x.place - 1))::int, 0) > 0) or x.games >= v_min
  on conflict (program_id, season_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function public.award_season(text) from public, anon, authenticated;

-- advance_season, now awarding the season it completes.
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
    perform public.award_season(s.id);
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

-- What the signed-in fan has waiting. Shape is documented in components/season-rewards-card.tsx.
create or replace function public.season_rewards_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'enabled', public.season_rewards_enabled(),
    'unclaimed', coalesce((
      select jsonb_agg(jsonb_build_object(
        'season_id', r.season_id, 'year', se.year, 'place', r.place,
        'league_size', (select count(*) from public.faction_season_finishes f where f.season_id = r.season_id
                        and f.league_id = (select league_id from public.faction_season_finishes f2 where f2.season_id = r.season_id and f2.faction_id = r.faction_id)),
        'games_played', r.games_played, 'place_cash', r.place_cash, 'played_cash', r.played_cash,
        'min_games', public.config_int('SEASON_REWARD_MIN_GAMES', 3))
        order by se.year)
      from public.program_season_rewards r
      join public.seasons se on se.id = r.season_id
      where r.program_id = public.my_program_id() and r.claimed_at is null), '[]'::jsonb));
$$;
revoke execute on function public.season_rewards_status() from public, anon;
grant execute on function public.season_rewards_status() to authenticated;

create or replace function public.claim_season_rewards()
returns table (seasons_claimed integer, reward integer, cash bigint)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare v_program uuid := public.my_program_id(); v_n integer; v_total integer; v_cash bigint;
begin
  if not public.season_rewards_enabled() then raise exception 'season rewards are not available yet'; end if;
  if v_program is null then raise exception 'no program for this account'; end if;
  with c as (
    update public.program_season_rewards r set claimed_at = now()
    where r.program_id = v_program and r.claimed_at is null
    returning r.place_cash + r.played_cash as amount
  )
  select count(*), coalesce(sum(amount), 0) into v_n, v_total from c;
  if v_n = 0 then raise exception 'nothing to claim'; end if;
  update public.program_treasury t set cash = t.cash + v_total where t.program_id = v_program returning t.cash into v_cash;
  perform public.touch_activity(v_program);
  return query select v_n, v_total, v_cash;
end;
$$;
revoke execute on function public.claim_season_rewards() from public, anon;
grant execute on function public.claim_season_rewards() to authenticated;
