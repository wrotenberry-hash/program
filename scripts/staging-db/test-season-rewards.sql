-- Staging test for migration 0020: season-end rewards. Run against a fresh staging copy:
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
create or replace function pg_temp.reward(p_email text) returns text language sql as $$
  select coalesce((select place || ':' || games_played || ':' || place_cash || '+' || played_cash
                   from public.program_season_rewards where program_id = pg_temp.pid(p_email) and season_id = '2026'), 'none');
$$;
grant all on results to authenticated;
grant usage, select on sequence results_n_seq to authenticated;

-- Fans: two Texas and one Oklahoma share SEC League 1; one Michigan fan never plays.
insert into auth.users (email, raw_user_meta_data)
select e || '@program.invalid', jsonb_build_object('display_name', e, 'date_of_birth', '1990-01-01')
from unnest(array['tx-lead', 'tx-two', 'ou-one', 'mi-one']) e;
insert into public.programs (account_id, school_id, name)
select u.id, v.school, v.name from auth.users u
join (values ('tx-lead', 'texas', 'Texas Longhorns'), ('tx-two', 'texas', 'Texas Longhorns'),
             ('ou-one', 'oklahoma', 'Oklahoma Sooners'), ('mi-one', 'michigan', 'Michigan Wolverines')) v(e, school, name)
  on u.email = v.e || '@program.invalid';

-- 2026 League games: tx-lead beats ou-one three times, tx-two once. One more tx-two
-- game is voided and must not count.
create or replace function pg_temp.game(p_home text, p_away text, p_week smallint, p_voided boolean default false) returns void language sql as $$
  insert into public.games (season_id, week_number, league_id, kind, home_program_id, away_program_id, home_faction_id, away_faction_id,
                            status, locks_at, resolved_at, result, voided_at, void_reason)
  select '2026', p_week, h.league_id, 'conference', h.program_id, a.program_id, h.faction_id, a.faction_id, 'resolved', now(), now(),
         jsonb_build_object('home_score', 24, 'away_score', 17, 'winner_program_id', h.program_id),
         case when p_voided then now() end, case when p_voided then 'test' end
  from public.league_seats h, public.league_seats a
  where h.program_id = pg_temp.pid(p_home) and a.program_id = pg_temp.pid(p_away) and h.status = 'active' and a.status = 'active';
$$;
select pg_temp.game('tx-lead', 'ou-one', 4::smallint), pg_temp.game('tx-lead', 'ou-one', 5::smallint),
       pg_temp.game('tx-lead', 'ou-one', 6::smallint), pg_temp.game('tx-two', 'ou-one', 7::smallint),
       pg_temp.game('tx-two', 'ou-one', 8::smallint, true);

select pg_temp.check('setup: Texas and Oklahoma share a League',
  (select count(distinct league_id) from public.league_seats where program_id in (pg_temp.pid('tx-lead'), pg_temp.pid('ou-one'))) = 1);

-- ---------------------------------------------------------------- season ends
select pg_temp.check('rewards: nothing recorded before the season ends',
  (select completed_season is null from public.advance_season('2026-12-04'))
  and (select count(*) from public.program_season_rewards) = 0);
select pg_temp.check('rewards: 2026 completes', (select completed_season = '2026' from public.advance_season('2026-12-06')));
select pg_temp.check('rewards: final places recorded, Texas 1st, Oklahoma 2nd',
  (select string_agg(fa.school_id || '=' || f.place, ',' order by f.place)
   from public.faction_season_finishes f join public.factions fa on fa.id = f.faction_id
   where f.season_id = '2026' and f.league_id = (select league_id from public.league_seats where program_id = pg_temp.pid('tx-lead')))
  = 'texas=1,oklahoma=2');
select pg_temp.check('rewards: champion who played 3 games gets place and played rewards', pg_temp.reward('tx-lead') = '1:3:3000+500', pg_temp.reward('tx-lead'));
select pg_temp.check('rewards: champion with 1 game gets the place reward only; voided game not counted', pg_temp.reward('tx-two') = '1:1:3000+0', pg_temp.reward('tx-two'));
select pg_temp.check('rewards: runner-up who played 4 games', pg_temp.reward('ou-one') = '2:4:1500+500', pg_temp.reward('ou-one'));
select pg_temp.check('rewards: a fan who never played gets nothing, even alone atop a League', pg_temp.reward('mi-one') = 'none', pg_temp.reward('mi-one'));
select pg_temp.check('rewards: house programs get nothing',
  (select count(*) from public.program_season_rewards r join public.programs p on p.id = r.program_id where p.is_house) = 0);
select pg_temp.check('rewards: a second award run adds nothing',
  public.award_season('2026') = 0 and (select count(*) from public.program_season_rewards) = 3);

-- ---------------------------------------------------------------- claiming
select pg_temp.as_user('tx-two@program.invalid');
set role authenticated;
select pg_temp.check('claim: off by default', (public.season_rewards_status() ->> 'enabled')::boolean = false);
select pg_temp.check('claim: the reward is waiting while off',
  (select (u ->> 'place_cash')::int = 3000 and (u ->> 'league_size')::int = 2 and (u ->> 'year')::int = 2026
   from jsonb_array_elements(public.season_rewards_status() -> 'unclaimed') u));
do $$ begin perform public.claim_season_rewards(); perform pg_temp.check('claim: blocked while off', false);
exception when others then perform pg_temp.check('claim: blocked while off', sqlerrm like '%not available%', sqlerrm); end $$;
select pg_temp.check('claim: players read only their own reward', (select count(*) from public.program_season_rewards) = 1);
reset role;

update public.game_config set value = '1'::jsonb where key = 'FEATURE_SEASON_REWARDS';
create temp table cash_before as select cash from public.program_treasury where program_id = pg_temp.pid('tx-two');
grant select on cash_before to authenticated;
set role authenticated;
select pg_temp.check('claim: pays the full reward into the budget',
  (select seasons_claimed = 1 and reward = 3000 and cash = (select cash from cash_before) + 3000 from public.claim_season_rewards()));
do $$ begin perform public.claim_season_rewards(); perform pg_temp.check('claim: only once', false);
exception when others then perform pg_temp.check('claim: only once', sqlerrm like '%nothing to claim%', sqlerrm); end $$;
select pg_temp.check('claim: nothing left waiting', jsonb_array_length(public.season_rewards_status() -> 'unclaimed') = 0);
reset role;
select pg_temp.check('claim: other fans'' rewards untouched',
  (select count(*) from public.program_season_rewards where claimed_at is null) = 2);
select pg_temp.check('maintenance: runs cleanly end to end', (select games_scheduled >= 0 from public.run_maintenance()));

\pset tuples_only off
select case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else detail end as detail from results order by n;
select count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' as summary from results;
