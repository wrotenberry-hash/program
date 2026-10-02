-- Season-end reward eligibility by games played for a faction. docs/phase-5/season-rewards.md
--
-- 0020 rewarded fans who held an active seat when the season ended. That
-- dropped fans who went inactive after playing, and paid fans who joined a
-- winning faction in the final week. Eligibility now comes from the games
-- themselves: every game records which faction each side played for.
--
--   Place prize:  the faction a fan played the most League games for that
--                 season (ties go to the better place), and only if that is at
--                 least SEASON_REWARD_PLACE_MIN_GAMES games. One place prize
--                 per fan per season, never two.
--   Played prize: unchanged. SEASON_REWARD_MIN_GAMES League games in total.
--
-- Seat status at season end no longer matters. No season has completed in
-- production, so no recorded rewards are affected.

alter table public.program_season_rewards
  add column faction_games integer not null default 0;
comment on column public.program_season_rewards.faction_id is 'Faction whose final place set the place prize: the one this fan played the most League games for';
comment on column public.program_season_rewards.faction_games is 'League games this fan played for faction_id this season';
comment on column public.program_season_rewards.games_played is 'League games this fan played this season, for any faction';

insert into public.game_config (key, value, description) values
  ('SEASON_REWARD_PLACE_MIN_GAMES', '3'::jsonb, 'League games a fan must play for a faction to share its place prize')
on conflict (key) do nothing;

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
  v_place_min integer := public.config_int('SEASON_REWARD_PLACE_MIN_GAMES', 3);
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

  insert into public.program_season_rewards (program_id, season_id, faction_id, place, games_played, faction_games, place_cash, played_cash)
  with sides as (
    -- One row per fan per League game, with the faction they played for.
    select x.program_id, x.faction_id
    from public.games g
    cross join lateral (values (g.home_program_id, g.home_faction_id), (g.away_program_id, g.away_faction_id)) x(program_id, faction_id)
    join public.programs p on p.id = x.program_id and not p.is_house
    where g.season_id = p_season_id and g.kind in ('conference', 'rivalry')
      and g.status = 'resolved' and g.voided_at is null
  ),
  per_faction as (
    select program_id, faction_id, count(*)::int as n
    from sides where faction_id is not null
    group by program_id, faction_id
  ),
  main_faction as (
    select distinct on (pf.program_id) pf.program_id, pf.faction_id, pf.n, f.place
    from per_faction pf
    left join public.faction_season_finishes f on f.season_id = p_season_id and f.faction_id = pf.faction_id
    order by pf.program_id, pf.n desc, f.place asc nulls last
  ),
  totals as (
    select program_id, count(*)::int as total from sides group by program_id
  ),
  scored as (
    select t.program_id, m.faction_id, m.place, t.total, coalesce(m.n, 0) as n,
           case when coalesce(m.n, 0) >= v_place_min then coalesce((v_places ->> (m.place - 1))::int, 0) else 0 end as place_cash,
           case when t.total >= v_min then v_played else 0 end as played_cash
    from totals t
    left join main_faction m on m.program_id = t.program_id
  )
  select program_id, p_season_id, faction_id, place, total, n, place_cash, played_cash
  from scored
  where place_cash > 0 or played_cash > 0
  on conflict (program_id, season_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function public.award_season(text) from public, anon, authenticated;
