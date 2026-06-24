-- 쿠폰 테이블
create table public.coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  title text not null,
  description text,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  discount_value integer not null,
  max_discount_amount integer,          -- percent 타입 최대 할인 cap
  min_order_amount integer default 0,
  max_uses integer,
  used_count integer default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.coupons enable row level security;
create policy "누구나 활성 쿠폰 조회" on public.coupons for select using (is_active = true);

-- 쿠폰 사용 이력 (1인 1회 제한)
create table public.coupon_uses (
  id uuid default gen_random_uuid() primary key,
  coupon_id uuid references public.coupons(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  used_at timestamptz default now(),
  unique(coupon_id, user_id)
);
alter table public.coupon_uses enable row level security;
create policy "본인 사용 이력 조회" on public.coupon_uses for select using (auth.uid() = user_id);
create policy "본인 사용 이력 생성" on public.coupon_uses for insert with check (auth.uid() = user_id);

-- 쿠폰 적용 RPC (used_count 원자적 증가 + 사용 이력 기록)
create or replace function public.apply_coupon(p_coupon_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.coupon_uses (coupon_id, user_id)
  values (p_coupon_id, auth.uid());

  update public.coupons
  set used_count = used_count + 1
  where id = p_coupon_id;
end;
$$;

-- 초기 쿠폰 데이터
insert into public.coupons
  (code, title, description, discount_type, discount_value, max_discount_amount, min_order_amount, max_uses, expires_at)
values
  ('WELCOME5000', '신규 회원 웰컴 쿠폰',        '첫 주문 5,000원 즉시 할인',          'fixed',   5000, null,  10000, 1000, '2026-07-31 23:59:59+09'),
  ('FREESHIP',    '마켓 첫 구매 무료배송 쿠폰',   '배송비 3,000원 할인',               'fixed',   3000, null,   5000, 2000, '2026-12-31 23:59:59+09'),
  ('RECIPE1000',  '레시피 크리에이터 쿠폰',       '영상 업로더를 위한 3,000원 할인',    'fixed',   3000, null,   5000,  200, '2026-08-15 23:59:59+09'),
  ('SUMMER30',    '여름 특가 30% 할인 쿠폰',      '최대 20,000원 할인 (최소 15,000원)','percent',   30, 20000, 15000,  500, '2026-07-15 23:59:59+09'),
  ('DAEITDA2026', '다잇다 오픈 기념 10% 쿠폰',   '전 상품 10% 할인 (최대 10,000원)', 'percent',   10, 10000,  5000, null, '2026-12-31 23:59:59+09');
