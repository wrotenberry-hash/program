-- 0008_scout_variable_conflict
-- The OUT parameter staff_id shadowed the column in ON CONFLICT.
create or replace function public.scout()
returns table (staff_id text, shards_granted integer, shards integer, next_scout_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_program   uuid := public.my_program_id();
  v_cooldown  integer := public.config_int('SCOUT_COOLDOWN_HOURS', 4);
  v_grant     integer := public.config_int('SCOUT_SHARDS', 5);
  v_last      timestamptz;
  v_count     integer;
  v_idx       integer;
  v_staff     text;
  v_total     integer;
  v_slot      bigint;
begin
  if v_program is null then raise exception 'no program for this account'; end if;
  select t.last_scouted_at into v_last from public.program_treasury t where t.program_id = v_program for update;
  if v_last is not null and v_last + make_interval(hours => v_cooldown) > now() then
    raise exception 'scouts are still out; back at %', to_char(v_last + make_interval(hours => v_cooldown), 'HH24:MI');
  end if;

  select count(*) into v_count from public.staff;
  if v_count = 0 then raise exception 'no staff catalog'; end if;
  v_slot := floor(extract(epoch from now()) / (greatest(v_cooldown, 1) * 3600))::bigint;
  v_idx := ((v_slot + (('x' || substr(md5(v_program::text), 1, 8))::bit(32)::bigint & 1023)) % v_count)::integer;
  select s.id into v_staff from public.staff s order by s.sort_order, s.id offset v_idx limit 1;

  insert into public.program_staff (program_id, staff_id, shards) values (v_program, v_staff, v_grant)
  on conflict (program_id, staff_id) do update set shards = public.program_staff.shards + v_grant
  returning public.program_staff.shards into v_total;

  update public.program_treasury t set last_scouted_at = now() where t.program_id = v_program;
  perform public.touch_activity(v_program);
  return query select v_staff, v_grant, v_total, now() + make_interval(hours => v_cooldown);
end;
$$;
