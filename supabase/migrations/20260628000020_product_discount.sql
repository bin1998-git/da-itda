-- 상품 할인 원가 컬럼 추가
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price integer;
