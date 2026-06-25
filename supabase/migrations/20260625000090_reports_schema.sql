CREATE TABLE reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type  TEXT        NOT NULL, -- post | media | product | comment | user
  target_id    TEXT        NOT NULL, -- UUID of target content
  reason       TEXT        NOT NULL, -- spam | adult | hate | fraud | copyright | other
  detail       TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending', -- pending | resolved | dismissed
  resolved_by  UUID        REFERENCES auth.users(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 본인 신고 내역 조회 + 관리자 전체 조회
CREATE POLICY "reports_select" ON reports
  FOR SELECT
  USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 로그인한 사용자만 신고 가능
CREATE POLICY "reports_insert" ON reports
  FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- 관리자만 처리(update)
CREATE POLICY "reports_admin_update" ON reports
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX reports_status_idx     ON reports(status);
CREATE INDEX reports_target_idx     ON reports(target_type, target_id);
CREATE INDEX reports_reporter_idx   ON reports(reporter_id);
CREATE INDEX reports_created_at_idx ON reports(created_at DESC);

-- 중복 신고 방지 (같은 사람이 같은 콘텐츠 여러 번 신고 불가)
CREATE UNIQUE INDEX reports_unique_reporter_target
  ON reports(reporter_id, target_type, target_id);
