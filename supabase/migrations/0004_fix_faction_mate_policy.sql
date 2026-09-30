-- 0004_fix_faction_mate_policy
-- The 0003 policy joined programs and league_seats inside a programs policy,
-- which recurses. A SECURITY DEFINER helper reads the seats without RLS.
drop policy if exists "faction mates read programs" on public.programs;

create or replace function public.is_faction_mate(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_seats mine
    join public.programs mp on mp.id = mine.program_id
    join public.league_seats theirs on theirs.faction_id = mine.faction_id
    where mp.account_id = auth.uid()
      and mine.status = 'active'
      and theirs.status = 'active'
      and theirs.program_id = p_program_id
  );
$$;
revoke execute on function public.is_faction_mate(uuid) from public, anon;
grant execute on function public.is_faction_mate(uuid) to authenticated;

create policy "faction mates read programs" on public.programs for select to authenticated
  using (public.is_faction_mate(id));
