-- 0009_pin_staff_power_search_path
alter function public.staff_power(smallint, smallint, integer, integer) set search_path = public;
