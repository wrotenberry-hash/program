-- 0016_generic_school_names
-- Generic fallback names for every school, used when FLAG_SCHOOL_NAMES is off.
-- Values live in supabase/seed/schools.csv (generic_name, generic_nickname).
-- The resolver also stores a name-free narrative template ({home}, {away}) so a
-- result can be shown with either set of names. Additive columns only.
alter table public.schools add column if not exists generic_name text;
alter table public.schools add column if not exists generic_nickname text;

do $$
declare d text;
begin
  select pg_get_functiondef('public.resolve_game(uuid)'::regprocedure) into d;
  if position('narrative_template' in d) = 0 then
    d := replace(d, $r$      'narrative', narrative)$r$,
                    $r$      'narrative', narrative,
      'narrative_template', replace(replace(narrative, h_name, '{home}'), a_name, '{away}'))$r$);
    execute d;
  end if;
end $$;
