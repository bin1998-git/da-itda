-- 리뷰 이미지 컬럼 추가
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS images jsonb;
