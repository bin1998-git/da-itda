alter table public.products
  add column if not exists colors text[] default '{}';
