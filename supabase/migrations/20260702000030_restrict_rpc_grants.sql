revoke execute on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function public.restore_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function public.increment_coupon_used(uuid) from public, anon, authenticated;

grant execute on function public.decrement_stock(uuid, integer) to service_role;
grant execute on function public.restore_stock(uuid, integer) to service_role;
grant execute on function public.increment_coupon_used(uuid) to service_role;
