-- 주문 테이블
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'paid',
  total_amount integer not null,
  discount_amount integer default 0,
  coupon_code text,
  created_at timestamptz default now()
);
alter table public.orders enable row level security;
create policy "본인 주문 조회" on public.orders for select using (auth.uid() = user_id);
create policy "주문 생성" on public.orders for insert with check (auth.uid() = user_id);
create policy "주문 수정" on public.orders for update using (auth.uid() = user_id);

-- 주문 상품 테이블
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  price integer not null,
  quantity integer not null,
  image_url text,
  created_at timestamptz default now()
);
alter table public.order_items enable row level security;
create policy "주문 아이템 조회" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "주문 아이템 생성" on public.order_items for insert with check (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
