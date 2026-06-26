-- profiles SELECT 정책 확인 및 재생성
DROP POLICY IF EXISTS "본인만 조회/수정" ON profiles;
CREATE POLICY "본인만 조회/수정" ON profiles
  USING (auth.uid() = id);

-- profiles 관리자 SELECT (이미 있으면 스킵)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_admin_select'
  ) THEN
    EXECUTE '
      CREATE POLICY "profiles_admin_select" ON profiles
        FOR SELECT
        USING (
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ''admin'')
        )
    ';
  END IF;
END $$;

-- inquiries SELECT: 본인 또는 관리자
DROP POLICY IF EXISTS "inquiries_select" ON inquiries;
CREATE POLICY "inquiries_select" ON inquiries
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
