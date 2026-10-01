-- Staging test for migrations 0017-0019: daily rewards, faction goals and the
-- officer role, and season rollover. Run against a fresh staging copy:
--   scripts/staging-db/up.sh && psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -f scripts/staging-db/test-test-week.sql program
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
grant all on results to authenticated;
grant usage, select on sequence results_n_seq to authenticated;

-- Fans: two Texas, one Oklahoma (same League by rivalry), one Michigan.
insert into auth.users (email, raw_user_meta_data)
select e || '@program.invalid', jsonb_build_object('display_name', e, 'date_of_birth', '1990-01-01')
from unnest(array['tx-lead', 'tx-two', 'ou-one', 'mi-one']) e;
insert into public.programs (account_id, school_id, name)
select u.id, v.school, v.name from auth.users u
join (values ('tx-lead', 'texas', 'Texas Longhorns'), ('tx-two', 'texas', 'Texas Longhorns'),
             ('ou-one', 'oklahoma', 'Oklahoma Sooners'), ('mi-one', 'michigan', 'Michigan Wolverines')) v(e, school, name)
  on u.email = v.e || '@program.invalid';

select pg_temp.check('placement: Texas and Oklahoma share SEC League 1',
  (select count(distinct s.league_id) from public.league_seats s join public.programs p on p.id = s.program_id where p.school_id in ('texas', 'oklahoma')) = 1);

-- ---------------------------------------------------------------- daily rewards
select pg_temp.as_user('tx-lead@program.invalid');
set role authenticated;
select pg_temp.check('daily: off by default', (public.daily_status() ->> 'enabled')::boolean = false);
do $$ begin perform public.claim_daily_checkin(); perform pg_temp.check('daily: claim blocked while off', false);
exception when others then perform pg_temp.check('daily: claim blocked while off', sqlerrm like '%not available%', sqlerrm); end $$;
reset role;
update public.game_config set value = '1'::jsonb where key = 'FEATURE_DAILY_REWARDS';
set role authenticated;
select pg_temp.check('daily: three tasks today', jsonb_array_length(public.daily_status() -> 'tasks') = 3, (public.daily_status() -> 'tasks')::text);
select pg_temp.check('daily: no task done for a brand-new program',
  not exists (select 1 from jsonb_array_elements(public.daily_status() -> 'tasks') t where (t ->> 'done')::boolean));
select pg_temp.check('daily: check-in day 1 pays 100', (select reward = 100 and streak = 1 from public.claim_daily_checkin()));
do $$ begin perform public.claim_daily_checkin(); perform pg_temp.check('daily: second check-in blocked', false);
exception when others then perform pg_temp.check('daily: second check-in blocked', sqlerrm like '%already%', sqlerrm); end $$;
-- Do all five things so whichever three tasks rotate in today are done.
select 1 from public.collect_income();
select 1 from public.scout();
select 1 from public.start_upgrade('stadium');
insert into public.faction_messages (faction_id, program_id, body)
select s.faction_id, s.program_id, 'Hook em' from public.my_seat() s;
reset role;
-- A friendly challenge. The code is looked up as the harness: players can't read others' programs.
select share_code as mi_code from public.programs where school_id = 'michigan' and not is_house \gset
select pg_temp.as_user('tx-lead@program.invalid');
set role authenticated;
select public.challenge_by_code(:'mi_code');
select pg_temp.check('daily: all of today''s tasks now done',
  not exists (select 1 from jsonb_array_elements(public.daily_status() -> 'tasks') t where not (t ->> 'done')::boolean),
  (public.daily_status() -> 'tasks')::text);
select pg_temp.check('daily: claiming every task pays its reward',
  (select sum(r.reward) from jsonb_array_elements(public.daily_status() -> 'tasks') t, lateral public.claim_daily_task(t ->> 'id') r)
   = (select sum((t ->> 'reward')::int) from jsonb_array_elements(public.daily_status() -> 'tasks') t));
do $$ begin perform public.claim_daily_task('collect'); perform pg_temp.check('daily: task claim is once a day', false);
exception when others then perform pg_temp.check('daily: task claim is once a day', sqlerrm like '%already%' or sqlerrm like '%not one of today%', sqlerrm); end $$;
reset role;
-- Streak: tx-two checked in yesterday at streak 6, so today is day 7.
insert into public.program_daily_checkins (program_id, day, streak, reward)
select id, public.local_day() - 1, 6, 400 from public.programs where account_id = (select id from auth.users where email = 'tx-two@program.invalid');
select pg_temp.as_user('tx-two@program.invalid');
set role authenticated;
select pg_temp.check('daily: streak day 7 pays 600', (select reward = 600 and streak = 7 from public.claim_daily_checkin()));
select pg_temp.check('daily: players cannot read others'' check-ins', (select count(*) from public.program_daily_checkins) = 2);
reset role;

-- ---------------------------------------------------------------- faction goals
update public.game_config set value = '1'::jsonb where key = 'FEATURE_FACTION_GOALS';
select pg_temp.as_user('tx-two@program.invalid');
set role authenticated;
do $$ begin perform public.set_faction_goal('league-wins'); perform pg_temp.check('goals: a member cannot set the goal', false);
exception when others then perform pg_temp.check('goals: a member cannot set the goal', sqlerrm like '%founder or an officer%', sqlerrm); end $$;
reset role;
select pg_temp.as_user('tx-lead@program.invalid');
set role authenticated;
select public.set_faction_goal('league-wins');
select pg_temp.check('goals: founder sets a goal, target scales with members',
  (public.faction_goal_status() -> 'goal' ->> 'target')::int = 1, (public.faction_goal_status() -> 'goal')::text);
reset role;
select p.id as tx_two_program from public.programs p join auth.users u on u.id = p.account_id where u.email = 'tx-two@program.invalid' \gset
set role authenticated;
select public.set_faction_role(:'tx_two_program', 'officer');
reset role;
select pg_temp.as_user('tx-two@program.invalid');
set role authenticated;
select pg_temp.check('goals: promoted to officer', public.faction_goal_status() ->> 'role' = 'officer');
select public.set_faction_goal('league-games');
select pg_temp.check('goals: officer can change the goal before progress', public.faction_goal_status() -> 'goal' ->> 'type_id' = 'league-games');
do $$ begin perform public.set_faction_role((select program_id from public.my_seat()), 'member'); perform pg_temp.check('goals: an officer cannot change roles', false);
exception when others then perform pg_temp.check('goals: an officer cannot change roles', sqlerrm like '%only the founder%', sqlerrm); end $$;
do $$ begin perform public.claim_faction_goal(); perform pg_temp.check('goals: no claim before the goal is met', false);
exception when others then perform pg_temp.check('goals: no claim before the goal is met', sqlerrm like '%not reached%', sqlerrm); end $$;
reset role;
-- Resolved League games this week, one per Texas fan (target is 0.8 per member, so 2).
insert into public.games (season_id, week_number, league_id, kind, home_program_id, away_program_id, home_faction_id, away_faction_id, status, locks_at, resolved_at, result)
select w.season_id, w.week_number, s.league_id, 'conference', s.program_id, o.program_id, s.faction_id, o.faction_id, 'resolved', now(), now(),
       jsonb_build_object('home_score', 24, 'away_score', 17, 'winner_program_id', s.program_id)
from public.current_week() w
join public.league_seats s on s.program_id = (select id from public.programs where account_id = (select id from auth.users where email = 'tx-lead@program.invalid'))
join public.league_seats o on o.program_id = (select id from public.programs where account_id = (select id from auth.users where email = 'ou-one@program.invalid'));
insert into public.games (season_id, week_number, league_id, kind, home_program_id, away_program_id, home_faction_id, away_faction_id, status, locks_at, resolved_at, result)
select w.season_id, w.week_number, s.league_id, 'conference', o.program_id, s.program_id, o.faction_id, s.faction_id, 'resolved', now(), now(),
       jsonb_build_object('home_score', 20, 'away_score', 23, 'winner_program_id', s.program_id)
from public.current_week() w
join public.league_seats s on s.program_id = (select id from public.programs where account_id = (select id from auth.users where email = 'tx-two@program.invalid'))
join public.league_seats o on o.program_id = (select id from public.programs where account_id = (select id from auth.users where email = 'ou-one@program.invalid'));
select pg_temp.as_user('tx-two@program.invalid');
set role authenticated;
select pg_temp.check('goals: progress counts the faction''s League games', (public.faction_goal_status() -> 'goal' ->> 'met')::boolean,
  (public.faction_goal_status() -> 'goal')::text);
do $$ begin perform public.set_faction_goal('challenges'); perform pg_temp.check('goals: goal locks once progress starts', false);
exception when others then perform pg_temp.check('goals: goal locks once progress starts', sqlerrm like '%locked%', sqlerrm); end $$;
select pg_temp.check('goals: shared reward pays every member', (select reward = 300 from public.claim_faction_goal()));
do $$ begin perform public.claim_faction_goal(); perform pg_temp.check('goals: one claim per member', false);
exception when others then perform pg_temp.check('goals: one claim per member', sqlerrm like '%already%', sqlerrm); end $$;
reset role;
select pg_temp.as_user('tx-lead@program.invalid');
set role authenticated;
select pg_temp.check('goals: the founder claims too', (select reward = 300 from public.claim_faction_goal()));
reset role;
select pg_temp.as_user('ou-one@program.invalid');
set role authenticated;
select pg_temp.check('goals: a rival faction cannot read Texas''s goal', (select count(*) from public.faction_weekly_goals) = 0);
reset role;

-- ---------------------------------------------------------------- season rollover
select public.refresh_standings('2026');
create temp table before as
select (select count(*) from public.programs where not is_house) programs,
       (select count(*) from public.league_seats where status = 'active') seats,
       (select sum(cash) from public.program_treasury) cash,
       (select count(*) from public.faction_standings where season_id = '2026') standings_2026,
       (select count(*) from public.games) games;
select pg_temp.check('rollover: nothing happens before the season ends',
  (select completed_season is null and activated_season is null from public.advance_season('2026-12-04')));
select pg_temp.check('rollover: the day after the season ends, 2026 completes',
  (select completed_season = '2026' and activated_season is null and leagues_settled = 0 from public.advance_season('2026-12-06')));
select pg_temp.check('rollover: 2026 complete, 2027 still upcoming',
  (select string_agg(id || '=' || status, ',' order by id) from public.seasons) = '2026=complete,2027=upcoming');
select pg_temp.check('rollover: a second run is a no-op',
  (select completed_season is null and activated_season is null from public.advance_season('2026-12-06')));
select pg_temp.check('rollover: programs, seats, budgets, games untouched',
  (select programs = (select count(*) from public.programs where not is_house)
      and seats = (select count(*) from public.league_seats where status = 'active')
      and cash = (select sum(cash) from public.program_treasury)
      and games = (select count(*) from public.games) from before));
select pg_temp.check('rollover: offseason screens show 2026 final and the 2027 start',
  (select season_id = '2026' and status = 'complete' and next_season_id = '2027' and next_starts_on = '2027-08-28' from public.season_display()));
select pg_temp.check('rollover: no League games scheduled in the offseason', public.schedule_current_week() = 0);
select pg_temp.check('rollover: 2027 activates on its first Saturday',
  (select activated_season = '2027' from public.advance_season('2027-08-28')));
select pg_temp.check('rollover: 2027 standings start empty, 2026 kept',
  (select count(*) from public.faction_standings where season_id = '2027') = 0
  and (select count(*) from public.faction_standings where season_id = '2026') = (select standings_2026 from before)
  and (select standings_2026 from before) > 0);
select pg_temp.check('rollover: Leagues opened mid-2026 stay open through 2027',
  (select count(*) from public.leagues where settled_at is not null) = 0);
select pg_temp.check('rollover: they settle when 2027 completes',
  (select completed_season = '2027' and leagues_settled = (select count(*) from public.leagues) from public.advance_season('2027-12-05')));
insert into auth.users (email, raw_user_meta_data) values ('tx-late@program.invalid', '{"display_name":"tx-late"}');
insert into public.programs (account_id, school_id, name) select id, 'texas', 'Texas Longhorns' from auth.users where email = 'tx-late@program.invalid';
select pg_temp.check('rollover: a new fan after settling opens a fresh League',
  (select l.number = 2 from public.league_seats s join public.leagues l on l.id = s.league_id
   join public.programs p on p.id = s.program_id join auth.users u on u.id = p.account_id where u.email = 'tx-late@program.invalid'));
select pg_temp.check('maintenance: runs cleanly end to end', (select games_scheduled >= 0 from public.run_maintenance()));

\pset tuples_only off
select case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else detail end as detail from results order by n;
select count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' as summary from results;
