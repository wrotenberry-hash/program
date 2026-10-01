-- 0015_feedback
-- "This confused me" feedback from every screen, and a token-gated export.
-- Players never read feedback; only the export function returns it.

create table public.feedback (
  id            bigint generated always as identity primary key,
  account_id    uuid references auth.users (id) on delete set null,
  program_id    uuid references public.programs (id) on delete set null,
  display_name  text,
  screen        text not null check (char_length(screen) between 1 and 200),
  note          text not null check (char_length(note) between 1 and 2000),
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
-- No policies: no client may read or write the table directly.

-- Secrets for admin endpoints, stored hashed. No policies: unreadable from the API.
create table public.admin_tokens (
  purpose       text primary key,
  token_sha256  text not null,
  created_at    timestamptz not null default now()
);
alter table public.admin_tokens enable row level security;

create or replace function public.submit_feedback(p_screen text, p_note text, p_user_agent text default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid := auth.uid();
  v_id bigint;
  v_recent integer;
begin
  if coalesce(trim(p_note), '') = '' then raise exception 'say what confused you'; end if;
  if v_account is not null then
    select count(*) into v_recent from public.feedback where account_id = v_account and created_at > now() - interval '1 hour';
    if v_recent >= public.config_int('FEEDBACK_PER_HOUR', 20) then raise exception 'thanks, that is plenty for now'; end if;
  end if;
  insert into public.feedback (account_id, program_id, display_name, screen, note, user_agent)
  values (
    v_account,
    case when v_account is null then null else (select id from public.programs where account_id = v_account) end,
    case when v_account is null then null else (select display_name from public.profiles where id = v_account) end,
    left(coalesce(nullif(trim(p_screen), ''), 'unknown'), 200),
    left(trim(p_note), 2000),
    left(p_user_agent, 300))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.submit_feedback(text, text, text) from public;
grant execute on function public.submit_feedback(text, text, text) to anon, authenticated;

create or replace function public.export_feedback(p_token text)
returns table (id bigint, created_at timestamptz, display_name text, account_id uuid, program_id uuid, screen text, note text, user_agent text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_tokens t
                 where t.purpose = 'feedback_export'
                   and t.token_sha256 = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')) then
    raise exception 'not authorized';
  end if;
  return query
    select f.id, f.created_at, f.display_name, f.account_id, f.program_id, f.screen, f.note, f.user_agent
    from public.feedback f order by f.created_at;
end;
$$;
revoke execute on function public.export_feedback(text) from public;
grant execute on function public.export_feedback(text) to anon, authenticated;

insert into public.game_config (key, value, description) values
  ('FEEDBACK_PER_HOUR', '20'::jsonb, 'Feedback notes one signed-in player may send per hour')
on conflict (key) do nothing;
