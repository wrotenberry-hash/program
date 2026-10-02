-- Staging test for migration 0023: adults-only beta. Run against a fresh staging copy:
--   scripts/staging-db/up.sh && psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -f scripts/staging-db/test-adults-only.sql program
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

-- adult, minor (16), turns 18 tomorrow, no date of birth, and a minor who joined before the switch.
insert into auth.users (email, raw_user_meta_data) values
  ('adult@program.invalid', '{"display_name":"adult","date_of_birth":"1990-01-01"}'),
  ('minor@program.invalid', jsonb_build_object('display_name', 'minor', 'date_of_birth', (current_date - interval '16 years')::date)),
  ('almost@program.invalid', jsonb_build_object('display_name', 'almost', 'date_of_birth', (current_date - interval '18 years' + interval '1 day')::date)),
  ('nodob@program.invalid', '{"display_name":"nodob"}'),
  ('early@program.invalid', jsonb_build_object('display_name', 'early', 'date_of_birth', (current_date - interval '16 years')::date));

create or replace function pg_temp.try_program(p_email text) returns text language plpgsql as $$
begin
  perform pg_temp.as_user(p_email);
  set local role authenticated;
  insert into public.programs (account_id, school_id, name) values (auth.uid(), 'texas', 'Texas Longhorns');
  reset role;
  return 'ok';
exception when others then
  reset role;
  return sqlerrm;
end $$;

select pg_temp.check('off: a minor can still join while the switch is off', pg_temp.try_program('early@program.invalid') = 'ok');

update public.game_config set value = '1'::jsonb where key = 'FEATURE_ADULTS_ONLY';
select pg_temp.check('on: an adult joins', pg_temp.try_program('adult@program.invalid') = 'ok');
select pg_temp.check('on: a 16-year-old is turned away', pg_temp.try_program('minor@program.invalid') = 'Program is for players 18 and older.');
select pg_temp.check('on: one day short of 18 is turned away', pg_temp.try_program('almost@program.invalid') = 'Program is for players 18 and older.');
select pg_temp.check('on: no date of birth is asked for', pg_temp.try_program('nodob@program.invalid') = 'Enter your date of birth to continue.');
select pg_temp.check('on: players who joined before the switch keep their program',
  exists (select 1 from public.programs p join auth.users u on u.id = p.account_id where u.email = 'early@program.invalid'));
select pg_temp.check('on: house programs are unaffected', (select count(*) from public.programs where is_house) > 0);

-- Changing a recorded date of birth.
select pg_temp.as_user('minor@program.invalid');
set role authenticated;
do $$ begin update public.profiles set date_of_birth = '1990-01-01' where id = auth.uid();
  perform pg_temp.check('lock: a player cannot change a recorded date of birth', false);
exception when others then perform pg_temp.check('lock: a player cannot change a recorded date of birth', sqlerrm like '%cannot be changed%', sqlerrm); end $$;
reset role;
select pg_temp.as_user('nodob@program.invalid');
set role authenticated;
update public.profiles set date_of_birth = '1990-01-01' where id = auth.uid();
reset role;
select pg_temp.check('lock: a missing date of birth can be filled in once', pg_temp.try_program('nodob@program.invalid') = 'ok');
select set_config('request.jwt.claims', '', false);
update public.profiles set date_of_birth = '1991-02-02' where id = (select id from auth.users where email = 'minor@program.invalid');
select pg_temp.check('lock: support can correct a date of birth', (select date_of_birth = '1991-02-02' from public.profiles where id = (select id from auth.users where email = 'minor@program.invalid')));

\pset tuples_only off
select case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else detail end as detail from results order by n;
select count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' as summary from results;
