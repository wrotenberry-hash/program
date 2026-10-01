-- 0018_daily_rewards
-- Daily check-in with a streak, and a three-item daily task strip. Every
-- reward is a fixed, config-driven cash amount: nothing random, nothing paid.
-- Gated in the database by FEATURE_DAILY_REWARDS (0 = off) and in the app by
-- FLAG_DAILY_REWARDS. Task completion is derived from what the player already
-- did today, so no gameplay function had to start logging.

create or replace function public.config_text(p_key text, p_default text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce((select value #>> '{}' from public.game_config where key = p_key), p_default);
$$;

-- The player's calendar day, in the configured reset time zone.
create or replace function public.local_day(p_at timestamptz default now())
returns date
language sql
stable
set search_path = public
as $$
  select (p_at at time zone public.config_text('DAILY_RESET_TZ', 'America/Chicago'))::date;
$$;

create table public.daily_task_types (
  id           text primary key,
  label        text not null,
  detector     text not null check (detector in ('collect', 'scout', 'upgrade', 'challenge', 'chat')),
  reward_cash  integer not null check (reward_cash >= 0),
  enabled      boolean not null default true,
  sort_order   smallint not null default 100
);

create table public.program_daily_checkins (
  program_id  uuid not null references public.programs (id) on delete cascade,
  day         date not null,
  streak      smallint not null,
  reward      integer not null,
  claimed_at  timestamptz not null default now(),
  primary key (program_id, day)
);

create table public.program_daily_task_claims (
  program_id  uuid not null references public.programs (id) on delete cascade,
  day         date not null,
  task_id     text not null references public.daily_task_types (id),
  reward      integer not null,
  claimed_at  timestamptz not null default now(),
  primary key (program_id, day, task_id)
);

alter table public.daily_task_types          enable row level security;
alter table public.program_daily_checkins    enable row level security;
alter table public.program_daily_task_claims enable row level security;
create policy "daily task types are public" on public.daily_task_types for select to anon, authenticated using (true);
create policy "read own checkins" on public.program_daily_checkins for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));
create policy "read own task claims" on public.program_daily_task_claims for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));

-- A brand-new program's last_collected_at is its creation time, so real
-- collections get their own timestamp.
alter table public.program_treasury add column if not exists last_collect_action_at timestamptz;
do $$
declare d text;
begin
  select pg_get_functiondef('public.collect_income()'::regprocedure) into d;
  if position('last_collect_action_at' in d) = 0 then
    d := replace(d, $r$set cash = t.cash + v_amount, last_collected_at = now()$r$,
                    $r$set cash = t.cash + v_amount, last_collected_at = now(), last_collect_action_at = now()$r$);
    if position('last_collect_action_at' in d) = 0 then raise exception 'collect_income anchor not found'; end if;
    execute d;
  end if;
end $$;

-- Upgrades clear upgrade_started_at when claimed, so keep a timestamp that stays.
alter table public.program_facilities add column if not exists last_started_at timestamptz;
do $$
declare d text;
begin
  select pg_get_functiondef('public.start_upgrade(text)'::regprocedure) into d;
  if position('last_started_at' in d) = 0 then
    d := replace(d, $r$set upgrade_to = v_next, upgrade_started_at = now(), upgrade_completes_at = v_done_at$r$,
                    $r$set upgrade_to = v_next, upgrade_started_at = now(), upgrade_completes_at = v_done_at, last_started_at = now()$r$);
    if position('last_started_at' in d) = 0 then raise exception 'start_upgrade anchor not found'; end if;
    execute d;
  end if;
end $$;

-- Today's tasks: the same DAILY_TASK_COUNT for everyone, rotated by date.
create or replace function public.daily_tasks_for(p_day date)
returns setof public.daily_task_types
language sql
stable
set search_path = public
as $$
  select t.* from public.daily_task_types t
  where t.enabled
  order by md5(p_day::text || t.id)
  limit public.config_int('DAILY_TASK_COUNT', 3);
$$;

-- Did this program do the thing today?
create or replace function public.daily_task_done(p_program_id uuid, p_detector text, p_day date)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return case p_detector
    when 'collect' then exists (select 1 from public.program_treasury t where t.program_id = p_program_id and t.last_collect_action_at is not null and public.local_day(t.last_collect_action_at) = p_day)
    when 'scout' then exists (select 1 from public.program_treasury t where t.program_id = p_program_id and t.last_scouted_at is not null and public.local_day(t.last_scouted_at) = p_day)
    when 'upgrade' then exists (select 1 from public.program_facilities f where f.program_id = p_program_id and f.last_started_at is not null and public.local_day(f.last_started_at) = p_day)
    when 'challenge' then exists (select 1 from public.games g where g.kind = 'challenge' and g.home_program_id = p_program_id and public.local_day(g.created_at) = p_day)
    when 'chat' then exists (select 1 from public.faction_messages m where m.program_id = p_program_id and public.local_day(m.created_at) = p_day)
    else false
  end;
end;
$$;
revoke execute on function public.daily_task_done(uuid, text, date) from public, anon, authenticated;

create or replace function public.daily_rewards_enabled()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.config_int('FEATURE_DAILY_REWARDS', 0) = 1;
$$;

-- Everything the daily strip needs, in one call.
create or replace function public.daily_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_program uuid := public.my_program_id();
  v_day date := public.local_day();
  v_rewards jsonb := coalesce((select value from public.game_config where key = 'DAILY_CHECKIN_REWARDS'), '[100]'::jsonb);
  v_prev smallint;
  v_next_streak integer;
  v_today record;
begin
  if v_program is null then return jsonb_build_object('enabled', false); end if;
  select * into v_today from public.program_daily_checkins where program_id = v_program and day = v_day;
  select streak into v_prev from public.program_daily_checkins where program_id = v_program and day = v_day - 1;
  v_next_streak := case when v_today.program_id is not null then v_today.streak else coalesce(v_prev, 0) + 1 end;
  return jsonb_build_object(
    'enabled', public.daily_rewards_enabled(),
    'day', v_day,
    'checkin', jsonb_build_object(
      'claimed', v_today.program_id is not null,
      'streak', v_next_streak,
      'reward', (v_rewards ->> ((v_next_streak - 1) % jsonb_array_length(v_rewards)))::int,
      'ladder', v_rewards),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'label', t.label, 'reward', t.reward_cash,
        'done', public.daily_task_done(v_program, t.detector, v_day),
        'claimed', exists (select 1 from public.program_daily_task_claims c where c.program_id = v_program and c.day = v_day and c.task_id = t.id))
        order by t.sort_order)
      from public.daily_tasks_for(v_day) t), '[]'::jsonb));
end;
$$;
revoke execute on function public.daily_status() from public, anon;
grant execute on function public.daily_status() to authenticated;

create or replace function public.claim_daily_checkin()
returns table (streak smallint, reward integer, cash bigint)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_program uuid := public.my_program_id();
  v_day date := public.local_day();
  v_rewards jsonb := coalesce((select value from public.game_config where key = 'DAILY_CHECKIN_REWARDS'), '[100]'::jsonb);
  v_prev smallint; v_streak smallint; v_reward integer; v_cash bigint;
begin
  if not public.daily_rewards_enabled() then raise exception 'daily rewards are not available yet'; end if;
  if v_program is null then raise exception 'no program for this account'; end if;
  if exists (select 1 from public.program_daily_checkins c where c.program_id = v_program and c.day = v_day) then
    raise exception 'already checked in today';
  end if;
  select c.streak into v_prev from public.program_daily_checkins c where c.program_id = v_program and c.day = v_day - 1;
  v_streak := coalesce(v_prev, 0) + 1;
  v_reward := (v_rewards ->> ((v_streak - 1) % jsonb_array_length(v_rewards)))::int;
  insert into public.program_daily_checkins (program_id, day, streak, reward) values (v_program, v_day, v_streak, v_reward);
  update public.program_treasury t set cash = t.cash + v_reward where t.program_id = v_program returning t.cash into v_cash;
  perform public.touch_activity(v_program);
  return query select v_streak, v_reward, v_cash;
end;
$$;
revoke execute on function public.claim_daily_checkin() from public, anon;
grant execute on function public.claim_daily_checkin() to authenticated;

create or replace function public.claim_daily_task(p_task_id text)
returns table (task_id text, reward integer, cash bigint)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_program uuid := public.my_program_id();
  v_day date := public.local_day();
  v_task record; v_cash bigint;
begin
  if not public.daily_rewards_enabled() then raise exception 'daily rewards are not available yet'; end if;
  if v_program is null then raise exception 'no program for this account'; end if;
  select * into v_task from public.daily_tasks_for(v_day) t where t.id = p_task_id;
  if v_task.id is null then raise exception 'that is not one of today''s tasks'; end if;
  if not public.daily_task_done(v_program, v_task.detector, v_day) then raise exception 'finish the task first'; end if;
  if exists (select 1 from public.program_daily_task_claims c where c.program_id = v_program and c.day = v_day and c.task_id = p_task_id) then
    raise exception 'already claimed';
  end if;
  insert into public.program_daily_task_claims (program_id, day, task_id, reward) values (v_program, v_day, p_task_id, v_task.reward_cash);
  update public.program_treasury t set cash = t.cash + v_task.reward_cash where t.program_id = v_program returning t.cash into v_cash;
  perform public.touch_activity(v_program);
  return query select p_task_id, v_task.reward_cash, v_cash;
end;
$$;
revoke execute on function public.claim_daily_task(text) from public, anon;
grant execute on function public.claim_daily_task(text) to authenticated;

insert into public.game_config (key, value, description) values
  ('FEATURE_DAILY_REWARDS', '0'::jsonb, 'Daily check-in and task strip. 0 = off. Founder approves before turning on in production.'),
  ('DAILY_RESET_TZ', '"America/Chicago"'::jsonb, 'Time zone whose midnight starts a new daily-rewards day'),
  ('DAILY_TASK_COUNT', '3'::jsonb, 'Daily tasks shown per day, rotated from the enabled task types'),
  ('DAILY_CHECKIN_REWARDS', '[100, 150, 200, 250, 300, 400, 600]'::jsonb, 'Check-in cash by streak day; repeats after the last entry')
on conflict (key) do nothing;
