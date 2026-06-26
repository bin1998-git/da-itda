-- profiles에 제재 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS comment_banned_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_banned_until     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS products_blocked      BOOLEAN NOT NULL DEFAULT FALSE;

-- inquiries에 파일첨부 컬럼 추가
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS file_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- board_posts 수정 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER board_posts_updated_at
  BEFORE UPDATE ON board_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
