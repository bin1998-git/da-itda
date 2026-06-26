-- profiles_admin_select 정책의 자기참조 RLS 루프 제거
-- 기존 문제: profiles 정책에서 profiles 서브쿼리 → 무한 재귀
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;

-- 관리자 역할 확인을 위한 security definer 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 이제 자기참조 없이 함수로 확인
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT
  USING (public.is_admin());

-- inquiries SELECT도 같은 함수 사용
DROP POLICY IF EXISTS "inquiries_select" ON inquiries;
CREATE POLICY "inquiries_select" ON inquiries
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- 관리자가 inquiries를 삭제할 수 있도록
DROP POLICY IF EXISTS "inquiries_delete" ON inquiries;
CREATE POLICY "inquiries_delete" ON inquiries
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );
