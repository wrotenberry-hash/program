-- Staging test for migrations 0020-0021: season-end rewards. Run against a fresh staging copy:
--   scripts/staging-db/up.sh && psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -f scripts/staging-db/test-season-rewards.sql program
-- Every check prints PASS or FAIL; the script stops on any SQL error.
\set QUIET on
\pset tuples_only on
\pset format unaligned

create temp table results (n serial, name text, ok boolean, detail text);
create or replace function pg_temp.check(p_name text, p_ok boolean, p_detail text default '') returns void
language sql as $$ insert into results (name, ok, detail) values (p_name, coalesce(p_ok, false), coalesce(p_detail, '')); $$;
create or replace function pg_temp.as_user(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users where email = p_email), 'role', 'authenticated')::text, false);
end $$;
create or replace function pg_temp.pid(p_email text) returns uuid language sql as $$
  select p.id from public.programs p join auth.users u on u.id = p.account_id where u.email = p_email || '@program.invalid';
$$;
-- place : League games in total : games for the prize faction : place prize + played prize
create or replace function pg_temp.reward(p_email text) returns text language sql as $$
  select coalesce((select coalesce(place::text, '-') || ':' || games_played || ':' || faction_games || ':' || place_cash || '+' || played_cash
                   from public.program_season_rewards where program_id = pg_temp.pid(p_email) and season_id = '2026'), 'none');
$$;
create or replace function pg_temp.fans(p_names text[]) returns void language sql as $$
  insert into auth.users (email, raw_user_meta_data)
  select e || '@program.invalid', jsonb_build_object('display_name', e, 'date_of_birth', '1990-01-01') from unnest(p_names) e;
  insert into public.programs (account_id, school_id, name)
  select u.id, case when e like 'tx-%' then 'texas' when e like 'ou-%' then 'oklahoma' else 'michigan' end, e
  from unnest(p_names) e join auth.users u on u.email = e || '@program.invalid';
$$;
-- A resolved League game; the home side wins. Factions come from each fan's seat at the time.
create or replace function pg_temp.game(p_home text, p_away text, p_week smallint, p_voided boolean default false) returns void language sql as $$
  insert into public.games (season_id, week_number, league_id, kind, home_program_id, away_program_id, home_faction_id, away_faction_id,
                            status, locks_at, resolved_at, result, voided_at, void_reason)
  select '2026', p_week, h.league_id, 'conference', h.program_id, a.program_id, h.faction_id, a.faction_id, 'resolved', now(), now(),
         jsonb_build_object('home_score', 24, 'away_score', 17, 'winner_program_id', h.program_id),
         case when p_voided then now() end, case when p_voided then 'test' end
  from public.league_seats h, public.league_seats a
  where h.program_id = pg_temp.pid(p_home) and a.program_id = pg_temp.pid(p_away) and h.status = 'active' and a.status = 'active';
$$;
-- Move a fan to their school's faction in another League (seat history is kept).
create or replace function pg_temp.move(p_email text, p_league uuid) returns void language sql as $$
  update public.league_seats set status = 'alumni' where program_id = pg_temp.pid(p_email) and status = 'active';
  insert into public.league_seats (program_id, league_id, faction_id, role)
  select pg_temp.pid(p_email), p_league, f.id, 'member'
  from public.factions f join public.programs p on p.school_id = f.school_id
  where f.league_id = p_league and p.id = pg_temp.pid(p_email);
$$;
grant all on results to authenticated;
grant usage, select on sequence results_n_seq to authenticated;

-- ---------------------------------------------------------------- the season
-- SEC League 1: Texas fans tx-lead, tx-two, tx-gone, tx-switch against Oklahoma's ou-one.
-- SEC League 2: Texas and Oklahoma factions; ou-two plays there. Michigan's mi-one never plays.
select pg_temp.fans(array['tx-lead', 'tx-two', 'tx-gone', 'tx-switch', 'ou-one', 'ou-two', 'mi-one']);
select league_id as l1 from public.league_seats where program_id = pg_temp.pid('tx-lead') \gset
insert into public.leagues (conference_id, number) select conference_id, 2 from public.leagues where id = :'l1';
select id as l2 from public.leagues where number = 2 and conference_id = (select conference_id from public.leagues where id = :'l1') \gset
insert into public.factions (league_id, school_id, name) values (:'l2', 'texas', 'Texas Longhorns'), (:'l2', 'oklahoma', 'Oklahoma Sooners');
select pg_temp.move('ou-two', :'l2');

select pg_temp.check('setup: League 1 holds the four Texas fans and ou-one',
  (select count(*) from public.league_seats where league_id = :'l1' and status = 'active') = 5);

-- tx-lead: 4 games for Texas L1, plus one voided game that must not count.
select pg_temp.game('tx-lead', 'ou-one', w::smallint) from generate_series(1, 4) w;
select pg_temp.game('tx-lead', 'ou-one', 5::smallint, true);
-- tx-two: 2 games for Texas L1. Under the 3-game minimum, no share of the title.
select pg_temp.game('tx-two', 'ou-one', w::smallint) from generate_series(1, 2) w;
-- tx-gone: 6 games for Texas L1, then goes inactive and the dormancy sweep removes the seat.
select pg_temp.game('tx-gone', 'ou-one', w::smallint) from generate_series(1, 6) w;
update public.league_seats set last_active_at = now() - interval '40 days' where program_id = pg_temp.pid('tx-gone');
select public.sweep_dormant_seats();
select pg_temp.check('setup: tx-gone was swept as dormant',
  not exists (select 1 from public.league_seats where program_id = pg_temp.pid('tx-gone') and status = 'active'));
-- tx-switch: 2 games for Texas L1 (champions), moves, then 3 losses for Texas L2 (runners-up).
select pg_temp.game('tx-switch', 'ou-one', w::smallint) from generate_series(1, 2) w;
select pg_temp.move('tx-switch', :'l2');
select pg_temp.game('ou-two', 'tx-switch', w::smallint) from generate_series(3, 5) w;
-- tx-late: joins in the final week and plays once for Texas L1.
select pg_temp.fans(array['tx-late']);
select pg_temp.game('tx-late', 'ou-one', 13::smallint);

-- ---------------------------------------------------------------- season ends
select pg_temp.check('rewards: nothing recorded before the season ends',
  (select completed_season is null from public.advance_season('2026-12-04'))
  and (select count(*) from public.program_season_rewards) = 0);
select pg_temp.check('rewards: 2026 completes', (select completed_season = '2026' from public.advance_season('2026-12-06')));
select pg_temp.check('finishes: League 1 Texas 1st, Oklahoma 2nd',
  (select string_agg(fa.school_id || '=' || f.place, ',' order by f.place) from public.faction_season_finishes f
   join public.factions fa on fa.id = f.faction_id where f.season_id = '2026' and f.league_id = :'l1') = 'texas=1,oklahoma=2');
select pg_temp.check('finishes: League 2 Oklahoma 1st, Texas 2nd',
  (select string_agg(fa.school_id || '=' || f.place, ',' order by f.place) from public.faction_season_finishes f
   join public.factions fa on fa.id = f.faction_id where f.season_id = '2026' and f.league_id = :'l2') = 'oklahoma=1,texas=2');

select pg_temp.check('rewards: champion with 4 games gets both prizes; voided game not counted', pg_temp.reward('tx-lead') = '1:4:4:3000+500', pg_temp.reward('tx-lead'));
select pg_temp.check('rewards: 2 games for the champions is under the 3-game minimum', pg_temp.reward('tx-two') = 'none', pg_temp.reward('tx-two'));
select pg_temp.check('rewards: inactive after 6 games keeps what they earned', pg_temp.reward('tx-gone') = '1:6:6:3000+500', pg_temp.reward('tx-gone'));
select pg_temp.check('rewards: late joiner with 1 game in the final week gets nothing', pg_temp.reward('tx-late') = 'none', pg_temp.reward('tx-late'));
select pg_temp.check('rewards: switcher gets the place of the faction they played most for (2nd, not the title)',
  pg_temp.reward('tx-switch') = '2:5:3:1500+500', pg_temp.reward('tx-switch'));
select pg_temp.check('rewards: switcher''s prize faction is Texas in League 2',
  (select f.league_id = :'l2' from public.program_season_rewards r join public.factions f on f.id = r.faction_id
   where r.program_id = pg_temp.pid('tx-switch')));
select pg_temp.check('rewards: switcher gets one place prize, never two',
  (select count(*) from public.program_season_rewards where program_id = pg_temp.pid('tx-switch')) = 1);
select pg_temp.check('rewards: runner-up with 15 games', pg_temp.reward('ou-one') = '2:15:15:1500+500', pg_temp.reward('ou-one'));
select pg_temp.check('rewards: champion in League 2 with exactly 3 games', pg_temp.reward('ou-two') = '1:3:3:3000+500', pg_temp.reward('ou-two'));
select pg_temp.check('rewards: a fan who never played gets nothing, even alone atop a League', pg_temp.reward('mi-one') = 'none', pg_temp.reward('mi-one'));
select pg_temp.check('rewards: house programs get nothing',
  (select count(*) from public.program_season_rewards r join public.programs p on p.id = r.program_id where p.is_house) = 0);
select pg_temp.check('rewards: a second award run adds nothing',
  public.award_season('2026') = 0 and (select count(*) from public.program_season_rewards) = 5);

-- ---------------------------------------------------------------- claiming
select pg_temp.as_user('tx-lead@program.invalid');
set role authenticated;
select pg_temp.check('claim: off by default', (public.season_rewards_status() ->> 'enabled')::boolean = false);
select pg_temp.check('claim: the reward is waiting while off',
  (select (u ->> 'place_cash')::int = 3000 and (u ->> 'played_cash')::int = 500 and (u ->> 'league_size')::int = 2 and (u ->> 'year')::int = 2026
   from jsonb_array_elements(public.season_rewards_status() -> 'unclaimed') u));
do $$ begin perform public.claim_season_rewards(); perform pg_temp.check('claim: blocked while off', false);
exception when others then perform pg_temp.check('claim: blocked while off', sqlerrm like '%not available%', sqlerrm); end $$;
select pg_temp.check('claim: players read only their own reward', (select count(*) from public.program_season_rewards) = 1);
reset role;

update public.game_config set value = '1'::jsonb where key = 'FEATURE_SEASON_REWARDS';
create temp table cash_before as select cash from public.program_treasury where program_id = pg_temp.pid('tx-lead');
grant select on cash_before to authenticated;
set role authenticated;
select pg_temp.check('claim: pays the full reward into the budget',
  (select seasons_claimed = 1 and reward = 3500 and cash = (select cash from cash_before) + 3500 from public.claim_season_rewards()));
do $$ begin perform public.claim_season_rewards(); perform pg_temp.check('claim: only once', false);
exception when others then perform pg_temp.check('claim: only once', sqlerrm like '%nothing to claim%', sqlerrm); end $$;
select pg_temp.check('claim: nothing left waiting', jsonb_array_length(public.season_rewards_status() -> 'unclaimed') = 0);
reset role;
select pg_temp.as_user('tx-gone@program.invalid');
set role authenticated;
select pg_temp.check('claim: an inactive fan can still claim when they come back', (select reward = 3500 from public.claim_season_rewards()));
reset role;
select pg_temp.check('claim: other fans'' rewards untouched',
  (select count(*) from public.program_season_rewards where claimed_at is null) = 3);
select pg_temp.check('maintenance: runs cleanly end to end', (select games_scheduled >= 0 from public.run_maintenance()));

\pset tuples_only off
select case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else detail end as detail from results order by n;
select count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' as summary from results;
