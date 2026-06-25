ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 관리자 여부를 빠르게 조회하기 위한 인덱스
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
