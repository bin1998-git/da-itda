-- 결제 관련 컬럼 추가
alter table public.orders
  add column if not exists payment_key text,
  add column if not exists paid_at timestamptz,
  add column if not exists fail_reason text,
  add column if not exists refunded_amount integer not null default 0;

-- 크리에이터 커미션 트리거: INSERT 시점 → status가 'paid'로 바뀌는 UPDATE 시점으로 이동
-- (이제 orders는 'pending'으로 먼저 생성되고, 결제 승인 후에만 'paid'가 됨)
drop trigger if exists trigger_creator_commission on public.orders;

create trigger trigger_creator_commission
after update of status on public.orders
for each row
when (new.status = 'paid' and old.status is distinct from 'paid')
execute function public.credit_creator_commission();

-- 재고 원자적 차감: 재고 부족 시 false 반환, 부족하지 않으면 차감 후 true
create or replace function public.decrement_stock(p_product_id uuid, p_qty integer)
returns boolean
language plpgsql
security definer
as $$
declare
  v_updated integer;
begin
  update public.products
  set stock = stock - p_qty
  where id = p_product_id and stock >= p_qty;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- 환불/자동취소 시 재고 원복
create or replace function public.restore_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
as $$
begin
  update public.products set stock = stock + p_qty where id = p_product_id;
end;
$$;

-- 쿠폰 사용횟수 원자적 증가 (결제 승인 후 서버에서 호출)
create or replace function public.increment_coupon_used(p_coupon_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.coupons set used_count = used_count + 1 where id = p_coupon_id;
end;
$$;
