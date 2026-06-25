-- orders 테이블에 배송지 컬럼 추가
alter table public.orders
  add column if not exists shipping_name text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_detail text;
