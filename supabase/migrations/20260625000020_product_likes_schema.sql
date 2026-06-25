-- 상품 위시리스트 테이블
create table public.product_likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);
alter table public.product_likes enable row level security;
create policy "누구나 위시리스트 조회" on public.product_likes for select using (true);
create policy "본인 위시리스트 관리" on public.product_likes for all using (auth.uid() = user_id);
