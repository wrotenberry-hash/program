-- 0002_harden_functions
-- Pin search_path on every function and keep the signup trigger off the API.
-- Closes the Supabase security advisor warnings raised after 0001.
alter function public.is_minor(date) set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.programs_lock_school() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
