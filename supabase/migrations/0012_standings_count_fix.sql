-- 0012_standings_count_fix
-- Factions with no resolved games were counted as 0-1: the left join's null row
-- fell into the "loss" branch. Count only real rows. Also lowers HOUSE_MIN_POWER
-- to 50 so a brand-new program's first League games are even.
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
  drop table if exists pg;
  create temp table pg on commit drop as
  select g.week_number, g.kind,
         x.program_id, x.faction_id, p.school_id,
         (x.program_id = (g.result ->> 'winner_program_id')::uuid) as won
  from public.games g
  cross join lateral (values (g.home_program_id, g.home_faction_id), (g.away_program_id, g.away_faction_id)) as x(program_id, faction_id)
  join public.programs p on p.id = x.program_id
  where g.season_id = p_season and g.status = 'resolved' and g.kind <> 'challenge' and not p.is_house;

  delete from public.faction_standings where season_id = p_season;
  insert into public.faction_standings (season_id, faction_id, league_id, wins, losses, points)
  select p_season, f.id, f.league_id,
         count(pg.program_id) filter (where pg.won),
         count(pg.program_id) filter (where pg.won = false),
         coalesce((
           select sum(pts) from (
             select r.pts, row_number() over (partition by r.week_number order by r.pts desc) as rn
             from (select pg2.week_number, case when pg2.won then v_win_pts else v_loss_pts end as pts from pg pg2 where pg2.faction_id = f.id) r
           ) ranked where rn <= v_topn
         ), 0)
  from public.factions f
  left join pg on pg.faction_id = f.id
  group by f.id, f.league_id;

  delete from public.nation_ledger where season_id = p_season;
  insert into public.nation_ledger (season_id, school_id, week_number, wins, losses, points)
  select p_season, school_id, week_number,
         count(*) filter (where won), count(*) filter (where won = false),
         sum(case when won then v_win_pts else v_loss_pts end)
  from pg group by school_id, week_number;

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

update public.game_config set value = '50'::jsonb, updated_at = now() where key = 'HOUSE_MIN_POWER';
