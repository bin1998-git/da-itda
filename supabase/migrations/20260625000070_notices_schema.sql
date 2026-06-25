CREATE TABLE notices (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  category   TEXT        NOT NULL DEFAULT 'general', -- general | update | event
  is_pinned  BOOLEAN     NOT NULL DEFAULT false,
  view_count INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "notices_select_all" ON notices
  FOR SELECT USING (true);

-- 관리자만 작성·수정·삭제
CREATE POLICY "notices_admin_write" ON notices
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "notices_admin_update" ON notices
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "notices_admin_delete" ON notices
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX notices_created_at_idx ON notices(created_at DESC);
CREATE INDEX notices_is_pinned_idx ON notices(is_pinned);
