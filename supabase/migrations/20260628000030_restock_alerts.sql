-- 재입고 알림 테이블
CREATE TABLE IF NOT EXISTS public.restock_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE public.restock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 알림 조회" ON public.restock_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인 알림 생성" ON public.restock_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인 알림 삭제" ON public.restock_alerts FOR DELETE USING (auth.uid() = user_id);
