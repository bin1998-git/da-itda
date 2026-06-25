-- profiles 테이블에 기본 주소 컬럼 추가
alter table public.profiles
  add column if not exists address text,
  add column if not exists address_detail text;

-- orders 테이블에 운송장 번호 컬럼 추가
alter table public.orders
  add column if not exists tracking_number text;
