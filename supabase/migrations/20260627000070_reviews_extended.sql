-- reviews 테이블 확장
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_reply     TEXT,
  ADD COLUMN IF NOT EXISTS seller_reply_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ;

-- 도움돼요 테이블
CREATE TABLE IF NOT EXISTS public.review_helpful (
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id)     ON DELETE CASCADE,
  PRIMARY KEY (review_id, user_id)
);
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;
CREATE POLICY "helpful_read"   ON public.review_helpful FOR SELECT USING (true);
CREATE POLICY "helpful_insert" ON public.review_helpful FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "helpful_delete" ON public.review_helpful FOR DELETE USING  (auth.uid() = user_id);

-- 리뷰 신고 테이블
CREATE TABLE IF NOT EXISTS public.review_reports (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id)     ON DELETE CASCADE,
  reason    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_insert"   ON public.review_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "report_read_own" ON public.review_reports FOR SELECT  USING  (auth.uid() = user_id);

-- 판매자가 자신의 상품 리뷰에 seller_reply 달 수 있도록
CREATE POLICY "seller_reply_update"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = reviews.product_id
        AND p.seller_id = auth.uid()
    )
  );

-- 도움돼요 토글 (atomic: insert or delete + count update)
CREATE OR REPLACE FUNCTION public.toggle_review_helpful(p_review_id UUID)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE already_voted BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.review_helpful
    WHERE review_id = p_review_id AND user_id = auth.uid()
  ) INTO already_voted;

  IF already_voted THEN
    DELETE FROM public.review_helpful
    WHERE review_id = p_review_id AND user_id = auth.uid();
    UPDATE public.reviews SET helpful_count = GREATEST(0, helpful_count - 1)
    WHERE id = p_review_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.review_helpful (review_id, user_id)
    VALUES (p_review_id, auth.uid());
    UPDATE public.reviews SET helpful_count = helpful_count + 1
    WHERE id = p_review_id;
    RETURN TRUE;
  END IF;
END;
$$;
