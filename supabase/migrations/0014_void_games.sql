-- 0014_void_games
-- A game can be voided: kept for audit, excluded from records, standings, the
-- Nation ledger, trophies, and every screen. Additive columns only.
-- Applied to Supabase as a patch of the existing function bodies; the effect
-- is that refresh_standings, league_week_games and resolve_due_games all add
-- "voided_at is null" to their game filters.
alter table public.games add column if not exists voided_at timestamptz;
alter table public.games add column if not exists void_reason text;

do $$
declare d text;
begin
  select pg_get_functiondef('public.refresh_standings(text)'::regprocedure) into d;
  if position('voided_at is null' in d) = 0 then
    d := replace(d, $r$where g.season_id = p_season and g.status = 'resolved' and g.kind <> 'challenge' and not p.is_house;$r$,
                    $r$where g.season_id = p_season and g.status = 'resolved' and g.voided_at is null and g.kind <> 'challenge' and not p.is_house;$r$);
    d := replace(d, $r$where g.season_id = p_season and g.kind = 'rivalry' and g.home_faction_id is not null and g.away_faction_id is not null$r$,
                    $r$where g.season_id = p_season and g.kind = 'rivalry' and g.voided_at is null and g.home_faction_id is not null and g.away_faction_id is not null$r$);
    execute d;
  end if;
  select pg_get_functiondef('public.league_week_games(uuid,text,smallint)'::regprocedure) into d;
  if position('voided_at is null' in d) = 0 then
    d := replace(d, $r$where g.season_id = p_season and g.week_number = p_week and g.kind <> 'challenge'$r$,
                    $r$where g.season_id = p_season and g.week_number = p_week and g.kind <> 'challenge' and g.voided_at is null$r$);
    execute d;
  end if;
  select pg_get_functiondef('public.resolve_due_games()'::regprocedure) into d;
  if position('voided_at is null' in d) = 0 then
    d := replace(d, $r$where status = 'scheduled' and locks_at <= now()$r$, $r$where status = 'scheduled' and voided_at is null and locks_at <= now()$r$);
    execute d;
  end if;
end $$;

-- Data change made 2026-10-01 at the founder's instruction (not part of the
-- migration): the 45-6 week-4 game against the Ole Miss house, resolved at the
-- pre-0011 flat house power, was voided and standings recomputed. A hard
-- delete needs the founder to confirm it interactively.
