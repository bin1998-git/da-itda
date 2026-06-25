CREATE TABLE inquiries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'general', -- order | shipping | product | general
  status      TEXT        NOT NULL DEFAULT 'pending', -- pending | answered
  answer      TEXT,
  answered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 본인 문의 조회 OR 관리자 전체 조회
CREATE POLICY "inquiries_select" ON inquiries
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 본인만 문의 작성
CREATE POLICY "inquiries_insert" ON inquiries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 관리자만 답변(update)
CREATE POLICY "inquiries_admin_update" ON inquiries
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 본인 또는 관리자가 삭제
CREATE POLICY "inquiries_delete" ON inquiries
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX inquiries_user_id_idx    ON inquiries(user_id);
CREATE INDEX inquiries_status_idx     ON inquiries(status);
CREATE INDEX inquiries_created_at_idx ON inquiries(created_at DESC);
