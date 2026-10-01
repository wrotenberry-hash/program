-- 0013_no_games_after_week_lock
-- The scheduler created games for a week whose lock time had already passed,
-- which is how a week-4 game got scheduled and resolved days after week 4
-- locked. Games for a week are now created only before that week locks.

create or replace function public.schedule_league_week(p_league_id uuid, p_season text, p_week smallint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conf text; v_kind text; v_locks timestamptz; v_week_locks timestamptz;
  schools text[]; n integer; rounds integer; r integer; i integer;
  lst text[]; a text; b text; total integer := 0;
  paired text[] := '{}';
  rv record; other_league uuid; fs uuid; ft uuid;
begin
  if exists (select 1 from public.games g where g.season_id = p_season and g.week_number = p_week and g.kind <> 'challenge'
             and (g.league_id = p_league_id
                  or exists (select 1 from public.factions f where f.league_id = p_league_id and f.id in (g.home_faction_id, g.away_faction_id)))) then
    return 0;
  end if;
  select w.kind, w.locks_at into v_kind, v_week_locks from public.season_weeks w where w.season_id = p_season and w.week_number = p_week;
  if v_kind is null or v_kind = 'nonconference' or v_kind = 'championship' then return 0; end if;
  -- Never create games for a week whose official lock has passed.
  if v_week_locks < now() then return 0; end if;
  v_locks := greatest(v_week_locks, now() + make_interval(mins => public.config_int('CHALLENGE_LOCK_MINUTES', 10)));
  select conference_id into v_conf from public.leagues where id = p_league_id;
  perform pg_advisory_xact_lock(hashtext('schedule:' || p_league_id::text));

  if v_kind = 'rivalry' then
    -- Primary rivals inside the conference, each pair once.
    for rv in
      select rp.school_id as s, rp.rival_school_id as t
      from public.rivalry_pairings rp
      join public.schools s1 on s1.id = rp.school_id and s1.conference_id = v_conf
      join public.schools s2 on s2.id = rp.rival_school_id and s2.conference_id = v_conf
      where rp.rank = 1 and rp.school_id < rp.rival_school_id
        and not exists (select 1 from public.rivalry_pairings rp2 where rp2.school_id = rp.rival_school_id and rp2.rank = 1 and rp2.rival_school_id <> rp.school_id
                        and exists (select 1 from public.schools s3 where s3.id = rp2.rival_school_id and s3.conference_id = v_conf))
    loop
      if rv.s = any(paired) or rv.t = any(paired) then continue; end if;
      select id into fs from public.factions where league_id = p_league_id and school_id = rv.s;
      select id into ft from public.factions where league_id = p_league_id and school_id = rv.t;
      -- Already matched this week from another League's orphan pool.
      if (fs is not null and public.faction_has_week_game(fs, p_season, p_week, 'rivalry'))
         or (ft is not null and public.faction_has_week_game(ft, p_season, p_week, 'rivalry')) then
        paired := paired || rv.s || rv.t; continue;
      end if;
      -- Orphan pool: this League has a faction for one side but not the other.
      if fs is not null and ft is null then
        select l2.id into other_league from public.leagues l2
        where l2.conference_id = v_conf and l2.id <> p_league_id
          and exists (select 1 from public.factions f where f.league_id = l2.id and f.school_id = rv.t
                      and not public.faction_has_week_game(f.id, p_season, p_week, 'rivalry'))
          and not exists (select 1 from public.factions f where f.league_id = l2.id and f.school_id = rv.s)
        order by l2.number limit 1;
        if other_league is not null then
          total := total + public.schedule_pair(p_season, p_week, 'rivalry', v_locks, p_league_id, rv.s, other_league, rv.t);
          paired := paired || rv.s || rv.t; continue;
        end if;
      elsif ft is not null and fs is null then
        select l2.id into other_league from public.leagues l2
        where l2.conference_id = v_conf and l2.id <> p_league_id
          and exists (select 1 from public.factions f where f.league_id = l2.id and f.school_id = rv.s
                      and not public.faction_has_week_game(f.id, p_season, p_week, 'rivalry'))
          and not exists (select 1 from public.factions f where f.league_id = l2.id and f.school_id = rv.t)
        order by l2.number limit 1;
        if other_league is not null then
          total := total + public.schedule_pair(p_season, p_week, 'rivalry', v_locks, p_league_id, rv.t, other_league, rv.s);
          paired := paired || rv.s || rv.t; continue;
        end if;
      end if;
      total := total + public.schedule_pair(p_season, p_week, 'rivalry', v_locks, p_league_id, rv.s, p_league_id, rv.t);
      paired := paired || rv.s || rv.t;
    end loop;
    -- Everyone else this week: round robin among the unpaired.
    schools := array(select id from public.schools where conference_id = v_conf and not (id = any(paired)) order by id);
  else
    schools := array(select id from public.schools where conference_id = v_conf order by id);
  end if;

  n := coalesce(array_length(schools, 1), 0);
  if n < 2 then return total; end if;
  if n % 2 = 1 then schools := schools || null::text; n := n + 1; end if;
  rounds := n - 1;
  r := (p_week % rounds);
  -- Circle method: fix schools[1], rotate the rest by r.
  lst := array[schools[1]];
  for i in 0..(n - 2) loop
    lst := lst || schools[2 + ((i + r) % (n - 1))];
  end loop;
  for i in 1..(n / 2) loop
    a := lst[i]; b := lst[n + 1 - i];
    if a is null or b is null then continue; end if;
    total := total + public.schedule_pair(p_season, p_week, case when v_kind = 'rivalry' then 'rivalry' else 'conference' end, v_locks, p_league_id, a, p_league_id, b);
  end loop;
  return total;
end;
$$;
