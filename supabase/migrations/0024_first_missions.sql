-- First missions: the guided first five minutes (docs/beta-plan.md).
-- A short ordered list of missions, one shown at a time. Each is done when
-- the game state says so (no self-reporting), pays a fixed config reward on
-- claim, and is recorded as a funnel step for the founder's numbers page.
-- Behind FEATURE_FIRST_MISSIONS (database) and FLAG_FIRST_MISSIONS (app).

-- "Pick your game plan" needs to know a player chose, not that a default was set.
alter table public.programs add column emphasis_chosen_at timestamptz;

create or replace function public.set_emphasis(p_emphasis_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_program uuid := public.my_program_id();
begin
  if v_program is null then raise exception 'no program for this account'; end if;
  if not exists (select 1 from public.emphases where id = p_emphasis_id) then raise exception 'unknown emphasis'; end if;
  update public.programs set emphasis_id = p_emphasis_id, emphasis_chosen_at = now() where id = v_program;
  perform public.touch_activity(v_program);
end;
$$;
revoke execute on function public.set_emphasis(text) from public, anon;
grant execute on function public.set_emphasis(text) to authenticated;

create table public.mission_types (
  id           text primary key check (id ~ '^[a-z][a-z0-9_]{2,30}$'),
  label        text not null,
  detector     text not null check (detector in ('collect', 'build_weight', 'open_weight', 'scout', 'game_plan', 'chat')),
  target       text not null, -- where the arrow points: a facility id, 'coin', or a screen path
  reward_cash  integer not null check (reward_cash >= 0),
  sort_order   smallint not null,
  enabled      boolean not null default true
);

create table public.program_mission_claims (
  program_id  uuid not null references public.programs (id) on delete cascade,
  mission_id  text not null references public.mission_types (id),
  reward      integer not null,
  claimed_at  timestamptz not null default now(),
  primary key (program_id, mission_id)
);

alter table public.mission_types          enable row level security;
alter table public.program_mission_claims enable row level security;
create policy "mission types are public" on public.mission_types for select to anon, authenticated using (true);
create policy "read own mission claims" on public.program_mission_claims for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.account_id = auth.uid()));

insert into public.game_config (key, value, description) values
  ('FEATURE_FIRST_MISSIONS', '0'::jsonb, 'Guided first missions on the campus home. 0 = off. Founder approves before turning on in production.')
on conflict (key) do nothing;

create or replace function public.first_missions_enabled()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.config_int('FEATURE_FIRST_MISSIONS', 0) = 1;
$$;

-- Whether a mission's condition holds now. Ever done, not done today.
create or replace function public.mission_done(p_program_id uuid, p_detector text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return case p_detector
    when 'collect' then exists (select 1 from public.program_treasury t where t.program_id = p_program_id and t.last_collect_action_at is not null)
    when 'build_weight' then exists (select 1 from public.program_facilities f where f.program_id = p_program_id and f.facility_id = 'weight-room' and (f.level >= 1 or f.upgrade_to is not null))
    when 'open_weight' then exists (select 1 from public.program_facilities f where f.program_id = p_program_id and f.facility_id = 'weight-room' and f.level >= 1)
    when 'scout' then exists (select 1 from public.program_treasury t where t.program_id = p_program_id and t.last_scouted_at is not null)
    when 'game_plan' then exists (select 1 from public.programs p where p.id = p_program_id and p.emphasis_chosen_at is not null)
    when 'chat' then exists (select 1 from public.faction_messages m where m.program_id = p_program_id)
    else false
  end;
end;
$$;
revoke execute on function public.mission_done(uuid, text) from public, anon, authenticated;

-- The current mission (the first unclaimed one, in order), or null when all are claimed.
create or replace function public.first_missions_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_program uuid := public.my_program_id();
  m record;
  v_total integer;
  v_claimed integer;
begin
  if v_program is null then return jsonb_build_object('enabled', false); end if;
  select count(*) into v_total from public.mission_types where enabled;
  select count(*) into v_claimed from public.program_mission_claims c join public.mission_types t on t.id = c.mission_id
    where c.program_id = v_program and t.enabled;
  select t.* into m from public.mission_types t
  where t.enabled and not exists (select 1 from public.program_mission_claims c where c.program_id = v_program and c.mission_id = t.id)
  order by t.sort_order limit 1;
  return jsonb_build_object(
    'enabled', public.first_missions_enabled(),
    'total', v_total,
    'claimed', v_claimed,
    'current', case when m.id is null then null else jsonb_build_object(
      'id', m.id, 'label', m.label, 'target', m.target, 'reward', m.reward_cash,
      'done', public.mission_done(v_program, m.detector)) end);
end;
$$;
revoke execute on function public.first_missions_status() from public, anon;
grant execute on function public.first_missions_status() to authenticated;

-- Claims the current mission. Only the current one, only when done, only once.
create or replace function public.claim_mission(p_mission_id text)
returns table (mission_id text, reward integer, cash bigint)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_program uuid := public.my_program_id();
  m record;
  v_cash bigint;
begin
  if not public.first_missions_enabled() then raise exception 'missions are not available yet'; end if;
  if v_program is null then raise exception 'no program for this account'; end if;
  select t.* into m from public.mission_types t
  where t.enabled and not exists (select 1 from public.program_mission_claims c where c.program_id = v_program and c.mission_id = t.id)
  order by t.sort_order limit 1;
  if m.id is null then raise exception 'all missions are done'; end if;
  if m.id <> p_mission_id then raise exception 'that is not the current mission'; end if;
  if not public.mission_done(v_program, m.detector) then raise exception 'not done yet'; end if;
  insert into public.program_mission_claims (program_id, mission_id, reward) values (v_program, m.id, m.reward_cash);
  update public.program_treasury t set cash = t.cash + m.reward_cash where t.program_id = v_program returning t.cash into v_cash;
  -- Funnel step for the founder's numbers page.
  insert into public.player_events (account_id, event, detail) values (auth.uid(), 'mission_' || m.id, jsonb_build_object('order', m.sort_order));
  perform public.touch_activity(v_program);
  return query select m.id, m.reward_cash, v_cash;
end;
$$;
revoke execute on function public.claim_mission(text) from public, anon;
grant execute on function public.claim_mission(text) to authenticated;
