-- 0011_phase4_fixes
-- 1. House power tracks the League's human average (floor HOUSE_MIN_POWER).
-- 2. A faction with a rivalry game already this week (cross-League) is skipped.
-- 3. The scheduled-already check counts cross-League games for this League's factions.

create or replace function public.facet_powers(p_program_id uuid)
returns table (rushing numeric, passing numeric, run_defense numeric, pass_defense numeric, total integer)
language sql
stable
security definer
set search_path = public
as $$
  with house as (
    select greatest(
      public.config_int('HOUSE_MIN_POWER', 100),
      coalesce((
        select round(avg(f.total))::integer
        from public.house_programs h
        join public.league_seats s on s.league_id = h.league_id and s.status = 'active'
        join public.programs hp on hp.id = s.program_id and not hp.is_house
        cross join lateral (
          select coalesce(sum(fl.power), 0) + coalesce((
            select sum(public.staff_power(ps.stars, ps.level, st.base_power, st.power_per_level))
            from public.program_staff ps join public.staff st on st.id = ps.staff_id where ps.program_id = hp.id and ps.stars > 0), 0) as total
          from public.program_facilities pf
          join public.facility_levels fl on fl.facility_id = pf.facility_id and fl.level = pf.level
          where pf.program_id = hp.id
        ) f
        where h.program_id = p_program_id
      ), 0)
    ) as base
    from public.programs p where p.id = p_program_id and p.is_house
  ),
  fac as (
    select coalesce(fl.power, 0) as power, ff.rushing, ff.passing, ff.run_defense, ff.pass_defense
    from public.program_facilities pf
    join public.facility_levels fl on fl.facility_id = pf.facility_id and fl.level = pf.level
    left join public.facility_facets ff on ff.facility_id = pf.facility_id
    where pf.program_id = p_program_id
  ),
  stf as (
    select public.staff_power(ps.stars, ps.level, s.base_power, s.power_per_level) as power,
           s.rushing, s.passing, s.run_defense, s.pass_defense
    from public.program_staff ps join public.staff s on s.id = ps.staff_id
    where ps.program_id = p_program_id and ps.stars > 0
  ),
  allrows as (
    select power, coalesce(rushing, 0.25) r, coalesce(passing, 0.25) p, coalesce(run_defense, 0.25) rd, coalesce(pass_defense, 0.25) pd from fac
    union all
    select power, rushing, passing, run_defense, pass_defense from stf
    union all
    select base, 0.25, 0.25, 0.25, 0.25 from house
  )
  select coalesce(sum(power * r), 0), coalesce(sum(power * p), 0), coalesce(sum(power * rd), 0), coalesce(sum(power * pd), 0), coalesce(sum(power), 0)::integer
  from allrows;
$$;

create or replace function public.faction_has_week_game(p_faction_id uuid, p_season text, p_week smallint, p_kind text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from public.games g where g.season_id = p_season and g.week_number = p_week and g.kind = p_kind
                 and p_faction_id in (g.home_faction_id, g.away_faction_id));
$$;

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

insert into public.game_config (key, value, description) values
  ('HOUSE_MIN_POWER', '100'::jsonb, 'Floor for a house program''s power; above it, the house matches the League''s human average')
on conflict (key) do update set value = excluded.value, description = excluded.description, updated_at = now();
delete from public.game_config where key = 'HOUSE_BASE_POWER';
