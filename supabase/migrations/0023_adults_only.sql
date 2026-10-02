-- Adults-only beta (CONTEXT.md 2026-10-02). Behind FEATURE_ADULTS_ONLY, off
-- until the beta opens. The app checks first for a friendly message; these
-- triggers make it impossible to get around from outside the app.

insert into public.game_config (key, value, description) values
  ('FEATURE_ADULTS_ONLY', '0'::jsonb, 'New programs require a date of birth showing 18 or older. 0 = off. On for the beta.')
on conflict (key) do nothing;

-- A date of birth, once recorded, cannot be changed by the player. Otherwise
-- someone turned away could retry with a different year. Support can still
-- correct it (no signed-in user in that session).
create or replace function public.profiles_lock_dob()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and old.date_of_birth is not null
     and new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'date of birth cannot be changed';
  end if;
  return new;
end;
$$;
create trigger profiles_lock_dob before update on public.profiles
  for each row execute function public.profiles_lock_dob();

create or replace function public.programs_adults_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_dob date;
begin
  if new.is_house or new.account_id is null or public.config_int('FEATURE_ADULTS_ONLY', 0) <> 1 then
    return new;
  end if;
  select date_of_birth into v_dob from public.profiles where id = new.account_id;
  if v_dob is null then
    raise exception 'Enter your date of birth to continue.';
  end if;
  if public.is_minor(v_dob) then
    raise exception 'Program is for players 18 and older.';
  end if;
  return new;
end;
$$;
revoke execute on function public.programs_adults_only() from public, anon, authenticated;
create trigger programs_adults_only before insert on public.programs
  for each row execute function public.programs_adults_only();
