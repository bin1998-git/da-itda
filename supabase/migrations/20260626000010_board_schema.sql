CREATE TABLE board_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  file_urls  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  view_count INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기
CREATE POLICY "board_posts_select" ON board_posts
  FOR SELECT USING (true);

-- 관리자만 작성
CREATE POLICY "board_posts_insert" ON board_posts
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 관리자만 수정
CREATE POLICY "board_posts_update" ON board_posts
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 관리자만 삭제
CREATE POLICY "board_posts_delete" ON board_posts
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX board_posts_created_at_idx ON board_posts(created_at DESC);

-- 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_board_view(post_id UUID)
RETURNS VOID AS $$
  UPDATE board_posts SET view_count = view_count + 1 WHERE id = post_id;
$$ LANGUAGE SQL SECURITY DEFINER;
