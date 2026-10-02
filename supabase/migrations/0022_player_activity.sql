-- Return-visit tracking. docs/beta-plan.md: the beta has to show whether fans
-- come back. Internal only: no player can read any of this, including their
-- own rows. Read through retention_report(token) by the founder.
--
--   player_days    one row per account per local day they opened the game
--   player_events  named steps (tutorial, invites) for funnels; added as built

create table public.player_days (
  account_id uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  sessions   integer not null default 1,
  primary key (account_id, day)
);
create index player_days_day_idx on public.player_days (day);

create table public.player_events (
  id         bigserial primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  event      text not null check (event ~ '^[a-z][a-z0-9_]{2,39}$'),
  at         timestamptz not null default now(),
  detail     jsonb not null default '{}'::jsonb check (pg_column_size(detail) < 2000)
);
create index player_events_event_idx on public.player_events (event, at);
create index player_events_account_idx on public.player_events (account_id, at);

-- RLS on with no policies: only the SECURITY DEFINER functions below touch these.
alter table public.player_days   enable row level security;
alter table public.player_events enable row level security;

insert into public.game_config (key, value, description) values
  ('EVENTS_PER_DAY', '300'::jsonb, 'Tracked events one account may record per day')
on conflict (key) do nothing;

create or replace function public.record_visit()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.player_days (account_id, day) values (auth.uid(), public.local_day())
  on conflict (account_id, day) do update set last_at = now(), sessions = public.player_days.sessions + 1;
end;
$$;
revoke execute on function public.record_visit() from public, anon;
grant execute on function public.record_visit() to authenticated;

create or replace function public.record_event(p_event text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  if (select count(*) from public.player_events e
      where e.account_id = auth.uid() and e.at > now() - interval '1 day') >= public.config_int('EVENTS_PER_DAY', 300) then
    return;
  end if;
  insert into public.player_events (account_id, event, detail) values (auth.uid(), p_event, coalesce(p_detail, '{}'::jsonb));
end;
$$;
revoke execute on function public.record_event(text, jsonb) from public, anon;
grant execute on function public.record_event(text, jsonb) to authenticated;

-- The founder's view. Same private key as the feedback export.
-- A cohort is the week a player first opened the game. Each return measure
-- reports "x of n", where n counts only players who have had time to return.
create or replace function public.retention_report(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_today date := public.local_day();
begin
  if not exists (select 1 from public.admin_tokens t
                 where t.purpose in ('feedback_export', 'founder')
                   and t.token_sha256 = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')) then
    raise exception 'not authorized';
  end if;
  return (
    with firsts as (
      select account_id, min(day) as first_day from public.player_days group by account_id
    ),
    per as (
      select f.account_id, f.first_day,
             exists (select 1 from public.player_days d where d.account_id = f.account_id and d.day = f.first_day + 1) as next_day,
             exists (select 1 from public.player_days d where d.account_id = f.account_id and d.day between f.first_day + 1 and f.first_day + 6) as first_week,
             exists (select 1 from public.player_days d where d.account_id = f.account_id and d.day >= f.first_day + 7) as after_week,
             (select count(*) from public.player_days d where d.account_id = f.account_id) as days_played
      from firsts f
    )
    select jsonb_build_object(
      'today', v_today,
      'players', (select count(*) from per),
      'active_today', (select count(*) from public.player_days where day = v_today),
      'active_7_days', (select count(distinct account_id) from public.player_days where day > v_today - 7),
      'cohorts', coalesce((
        select jsonb_agg(c order by c ->> 'week_of')
        from (
          select jsonb_build_object(
            'week_of', date_trunc('week', first_day)::date,
            'players', count(*),
            'next_day', count(*) filter (where next_day),
            'next_day_of', count(*) filter (where first_day + 1 <= v_today),
            'first_week', count(*) filter (where first_week),
            'first_week_of', count(*) filter (where first_day + 1 <= v_today),
            'after_week', count(*) filter (where after_week),
            'after_week_of', count(*) filter (where first_day + 7 <= v_today),
            'avg_days_played', round(avg(days_played), 1)) as c
          from per group by date_trunc('week', first_day)
        ) x), '[]'::jsonb),
      'events', coalesce((
        select jsonb_object_agg(event, n) from (
          select event, count(distinct account_id) as n from public.player_events group by event) e), '{}'::jsonb))
  );
end;
$$;
revoke execute on function public.retention_report(text) from public;
grant execute on function public.retention_report(text) to anon, authenticated;

-- Backfill the days we can see from before tracking started: the day each
-- program was created and each seat's last activity. Approximate by nature.
insert into public.player_days (account_id, day, first_at, last_at)
select p.account_id, (p.created_at at time zone public.config_text('DAILY_RESET_TZ', 'America/Chicago'))::date, p.created_at, p.created_at
from public.programs p where p.account_id is not null and not p.is_house
on conflict do nothing;
insert into public.player_days (account_id, day, first_at, last_at)
select p.account_id, (s.last_active_at at time zone public.config_text('DAILY_RESET_TZ', 'America/Chicago'))::date, s.last_active_at, s.last_active_at
from public.league_seats s join public.programs p on p.id = s.program_id
where p.account_id is not null and not p.is_house
on conflict do nothing;
