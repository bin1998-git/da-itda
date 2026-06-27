-- 판매자가 자기 상품 포함된 주문의 상태를 변경할 수 있도록
CREATE POLICY "판매자 주문 상태 업데이트" ON public.orders FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id
      AND p.seller_id = auth.uid()
  )
);
