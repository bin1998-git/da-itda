-- 판매자 테이블
create table public.sellers (
  id uuid references public.profiles(id) on delete cascade primary key,
  store_name text not null,
  store_desc text,
  is_verified boolean default false,
  created_at timestamptz default now()
);
alter table public.sellers enable row level security;
create policy "누구나 판매자 조회" on public.sellers for select using (true);
create policy "본인 판매자 관리" on public.sellers for all using (auth.uid() = id);

-- 상품 테이블
create table public.products (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.sellers(id) on delete cascade not null,
  title text not null,
  description text,
  price integer not null,
  category text not null default 'food',
  images text[] default '{}',
  stock integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.products enable row level security;
create policy "누구나 상품 조회" on public.products for select using (is_active = true);
create policy "판매자 상품 관리" on public.products for all using (auth.uid() = seller_id);

-- 장바구니 테이블
create table public.cart_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer default 1 not null,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);
alter table public.cart_items enable row level security;
create policy "본인 장바구니" on public.cart_items for all using (auth.uid() = user_id);

-- 더미 데이터 (테스트용 판매자 없이 상품만 삽입)
-- 실제 판매자 UUID는 로그인 후 생성되므로 여기선 더미 판매자용 시스템 UUID 사용
do $$
declare
  dummy_seller_id uuid := gen_random_uuid();
begin
  -- profiles에 더미 판매자 추가 (auth.users 없이)
  -- 대신 기존 auth 사용자가 있으면 그걸 사용하기 위해 먼저 profiles 조회
  -- 더미 데이터는 seller_id에 NULL 가능하도록 우회하지 않고 별도 접근
  -- → 실제로는 로그인 후 /market/sell 에서 등록하는 방식 유지
  null;
end $$;
