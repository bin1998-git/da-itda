-- 판매자가 자신의 상품에 대한 주문 아이템을 조회할 수 있도록 RLS 정책 추가
create policy "판매자 주문 아이템 조회" on public.order_items for select using (
  exists (
    select 1 from public.products
    where products.id = order_items.product_id
      and products.seller_id = auth.uid()
  )
);
