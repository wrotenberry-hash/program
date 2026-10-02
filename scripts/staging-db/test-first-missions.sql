-- Staging test for migration 0024: first missions. Run against a fresh staging copy:
--   scripts/staging-db/up.sh && psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -f scripts/staging-db/test-first-missions.sql program
\set QUIET on
\pset tuples_only on
\pset format unaligned

create temp table results (n serial, name text, ok boolean, detail text);
create or replace function pg_temp.check(p_name text, p_ok boolean, p_detail text default '') returns void
language sql as $$ insert into results (name, ok, detail) values (p_name, coalesce(p_ok, false), coalesce(p_detail, '')); $$;
create or replace function pg_temp.cur() returns text language sql as $$ select public.first_missions_status() -> 'current' ->> 'id'; $$;
create or replace function pg_temp.done() returns boolean language sql as $$ select (public.first_missions_status() -> 'current' ->> 'done')::boolean; $$;
grant all on results to authenticated;
grant usage, select on sequence results_n_seq to authenticated;

insert into auth.users (email, raw_user_meta_data) values ('rookie@program.invalid', '{"display_name":"rookie","date_of_birth":"1990-01-01"}');
insert into public.programs (account_id, school_id, name) select id, 'texas', 'Texas Longhorns' from auth.users where email = 'rookie@program.invalid';
select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users where email = 'rookie@program.invalid'), 'role', 'authenticated')::text, false);

set role authenticated;
select pg_temp.check('off: status says disabled', (public.first_missions_status() ->> 'enabled')::boolean = false);
select pg_temp.check('start: first mission is collect, not done', pg_temp.cur() = 'collect' and not pg_temp.done(), pg_temp.cur());
select pg_temp.check('start: a default game plan does not count as choosing one',
  (select emphasis_id is not null and emphasis_chosen_at is null from public.programs where account_id = auth.uid()));
do $$ begin perform public.claim_mission('collect'); perform pg_temp.check('off: claim blocked', false);
exception when others then perform pg_temp.check('off: claim blocked', sqlerrm like '%not available%', sqlerrm); end $$;
reset role;
update public.game_config set value = '1'::jsonb where key = 'FEATURE_FIRST_MISSIONS';

set role authenticated;
do $$ begin perform public.claim_mission('collect'); perform pg_temp.check('on: cannot claim before doing it', false);
exception when others then perform pg_temp.check('on: cannot claim before doing it', sqlerrm like '%not done%', sqlerrm); end $$;
do $$ begin perform public.claim_mission('scout'); perform pg_temp.check('on: cannot skip ahead', false);
exception when others then perform pg_temp.check('on: cannot skip ahead', sqlerrm like '%not the current%', sqlerrm); end $$;
reset role;
update public.program_treasury set last_collected_at = now() - interval '2 hours' where program_id = (select id from public.programs where account_id = (select id from auth.users where email = 'rookie@program.invalid'));
set role authenticated;
select public.collect_income();
select pg_temp.check('collect: done after collecting', pg_temp.done());
create temp table c1 as select * from public.claim_mission('collect');
select pg_temp.check('collect: claim pays 100', (select reward = 100 from c1));
do $$ begin perform public.claim_mission('collect'); perform pg_temp.check('collect: only once', false);
exception when others then perform pg_temp.check('collect: only once', sqlerrm like '%not the current%', sqlerrm); end $$;
select pg_temp.check('next: build the weight room', pg_temp.cur() = 'build_weight' and not pg_temp.done(), pg_temp.cur());
select public.start_upgrade('weight-room');
select pg_temp.check('build: done once construction starts', pg_temp.done());
select public.claim_mission('build_weight');
select pg_temp.check('open: not done while under construction', pg_temp.cur() = 'open_weight' and not pg_temp.done());
reset role;
update public.program_facilities set upgrade_completes_at = now() - interval '1 second'
where facility_id = 'weight-room' and program_id = (select id from public.programs where account_id = (select id from auth.users where email = 'rookie@program.invalid'));
set role authenticated;
select public.claim_upgrade('weight-room');
select pg_temp.check('open: done once claimed', pg_temp.done());
select public.claim_mission('open_weight');
select pg_temp.check('next: scout', pg_temp.cur() = 'scout');
select public.scout();
select public.claim_mission('scout');
select pg_temp.check('next: game plan', pg_temp.cur() = 'game_plan' and not pg_temp.done());
select public.set_emphasis('air-raid');
select pg_temp.check('game plan: done once chosen', pg_temp.done());
select public.claim_mission('game_plan');
select pg_temp.check('next: say hi', pg_temp.cur() = 'say_hi' and not pg_temp.done());
insert into public.faction_messages (faction_id, program_id, body)
select s.faction_id, s.program_id, 'hello' from public.league_seats s join public.programs p on p.id = s.program_id where p.account_id = auth.uid() and s.status = 'active';
select public.claim_mission('say_hi');
select pg_temp.check('finish: no current mission, all six claimed',
  pg_temp.cur() is null and (public.first_missions_status() ->> 'claimed')::int = 6 and (public.first_missions_status() ->> 'total')::int = 6);
select pg_temp.check('finish: players read only their own claims', (select count(*) from public.program_mission_claims) = 6);
reset role;
select pg_temp.check('funnel: every claim recorded as a step',
  (select count(*) from public.player_events where event like 'mission_%') = 6);

\pset tuples_only off
select case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else detail end as detail from results order by n;
select count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' as summary from results;
