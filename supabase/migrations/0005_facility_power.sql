-- 0005_facility_power
-- Each facility level contributes to program Power. Additive nullable column.
alter table public.facility_levels add column if not exists power integer;

-- Program Power: the sum of the power of every facility at its current level.
create or replace function public.program_power(p_program_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(fl.power), 0)::integer
  from public.program_facilities pf
  join public.facility_levels fl on fl.facility_id = pf.facility_id and fl.level = pf.level
  where pf.program_id = p_program_id;
$$;
