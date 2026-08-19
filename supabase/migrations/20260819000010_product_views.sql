-- 상품 조회수 (미디어/커뮤니티 글과 동일한 패턴)
alter table public.products add column if not exists views integer default 0;

create or replace function public.increment_product_views(product_id uuid)
returns void language sql security definer as $$
  update public.products set views = views + 1 where id = product_id;
$$;
