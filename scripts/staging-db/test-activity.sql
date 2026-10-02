-- Staging test for migration 0022: return-visit tracking. Run against a fresh staging copy:
--   scripts/staging-db/up.sh && psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -f scripts/staging-db/test-activity.sql program
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

insert into auth.users (email, raw_user_meta_data)
select e || '@program.invalid', jsonb_build_object('display_name', e, 'date_of_birth', '1990-01-01')
from unnest(array['a', 'b', 'c']) e;
insert into public.programs (account_id, school_id, name)
select id, 'texas', 'Texas Longhorns' from auth.users where email like '%@program.invalid';
insert into public.admin_tokens (purpose, token_sha256) values ('feedback_export', encode(sha256(convert_to('secret-token', 'UTF8')), 'hex'))
on conflict (purpose) do update set token_sha256 = excluded.token_sha256;

select pg_temp.as_user('a@program.invalid');
set role authenticated;
select public.record_visit();
select public.record_visit();
select public.record_event('tutorial_start');
select pg_temp.check('privacy: a player cannot read visit rows, even their own', (select count(*) from public.player_days) = 0);
select pg_temp.check('privacy: a player cannot read event rows', (select count(*) from public.player_events) = 0);
do $$ begin perform public.record_event('Bad Name!'); perform pg_temp.check('events: malformed names rejected', false);
exception when others then perform pg_temp.check('events: malformed names rejected', true); end $$;
reset role;
select pg_temp.check('visits: two opens on one day are one day, two sessions',
  (select count(*) = 1 and max(sessions) = 2 from public.player_days
   where account_id = (select id from auth.users where email = 'a@program.invalid') and day = public.local_day()));

-- Signed-out calls do nothing.
create temp table days_before as select count(*) n, sum(sessions) s from public.player_days;
select set_config('request.jwt.claims', '', false);
set role authenticated;
select public.record_visit();
select public.record_event('tutorial_start');
reset role;
select pg_temp.check('visits: signed-out calls record nothing',
  (select n = (select count(*) from public.player_days) and s = (select sum(sessions) from public.player_days) from days_before)
  and (select count(*) from public.player_events) = 1);

-- History: a first played 8 days ago and came back the next day and today; b first played
-- 2 days ago and never returned; c started today.
delete from public.player_days;
insert into public.player_days (account_id, day)
select u.id, public.local_day() + d
from auth.users u join (values ('a', -8), ('a', -7), ('a', 0), ('b', -2), ('c', 0)) v(e, d) on u.email = v.e || '@program.invalid';

do $$ begin perform public.retention_report('nope'); perform pg_temp.check('report: wrong key refused', false);
exception when others then perform pg_temp.check('report: wrong key refused', sqlerrm like '%not authorized%', sqlerrm); end $$;
create temp table r as select public.retention_report('secret-token') as j;
select pg_temp.check('report: three players, two active today, three this week',
  (select (j ->> 'players')::int = 3 and (j ->> 'active_today')::int = 2 and (j ->> 'active_7_days')::int = 3 from r), (select j::text from r));
select pg_temp.check('report: next-day return counts only players who had a next day',
  (select sum((c ->> 'next_day')::int) = 1 and sum((c ->> 'next_day_of')::int) = 2 from r, jsonb_array_elements(j -> 'cohorts') c),
  (select (j -> 'cohorts')::text from r));
select pg_temp.check('report: after-a-week return counts only players a week in',
  (select sum((c ->> 'after_week')::int) = 1 and sum((c ->> 'after_week_of')::int) = 1 from r, jsonb_array_elements(j -> 'cohorts') c));
select pg_temp.check('report: funnel events counted by player', (select (j -> 'events' ->> 'tutorial_start')::int = 1 from r));

\pset tuples_only off
select case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else detail end as detail from results order by n;
select count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' as summary from results;
