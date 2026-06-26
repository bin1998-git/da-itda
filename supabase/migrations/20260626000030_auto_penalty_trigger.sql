-- supabase/migrations/20260626000030_auto_penalty_trigger.sql
-- 신고(reports) INSERT 후 자동제재 트리거
-- 제재 규칙:
--   hate  : 누적 3회→7일 댓글금지, 6회→30일, 9회+→영구
--   spam  : 누적 3회→7일 게시+댓글금지, 6회+→30일
--   adult : 누적 2회→30일 게시금지, 4회+→영구
--   fraud : 즉시 모든 상품 비활성화 + 재등록 차단

CREATE OR REPLACE FUNCTION handle_report_auto_penalty()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user UUID;
  v_count       INT;
BEGIN
  -- 신고 대상 콘텐츠의 소유자 찾기
  -- products.seller_id = sellers.id = profiles.id (동일 UUID 체계)
  CASE NEW.target_type
    WHEN 'comment' THEN
      SELECT user_id   INTO v_target_user FROM comments    WHERE id = NEW.target_id::UUID;
    WHEN 'post' THEN
      SELECT user_id   INTO v_target_user FROM posts       WHERE id = NEW.target_id::UUID;
    WHEN 'product' THEN
      SELECT seller_id INTO v_target_user FROM products    WHERE id = NEW.target_id::UUID;
    WHEN 'media' THEN
      SELECT user_id   INTO v_target_user FROM media_posts WHERE id = NEW.target_id::UUID;
    WHEN 'user' THEN
      v_target_user := NEW.target_id::UUID;
    ELSE
      RETURN NEW;
  END CASE;

  IF v_target_user IS NULL THEN RETURN NEW; END IF;

  -- ① 사기: 즉시 모든 상품 비활성화 + 재등록 차단
  IF NEW.reason = 'fraud' THEN
    UPDATE products
      SET is_active = FALSE
      WHERE seller_id = v_target_user AND is_active = TRUE;
    UPDATE profiles
      SET products_blocked = TRUE
      WHERE id = v_target_user;
    RETURN NEW;
  END IF;

  -- ② 욕설/혐오: 해당 유저 소유 콘텐츠에 대한 누적 hate 신고 수
  IF NEW.reason = 'hate' THEN
    SELECT COUNT(*) INTO v_count
      FROM reports r
      WHERE r.reason = 'hate'
        AND r.target_type IN ('comment', 'post', 'media')
        AND r.target_id IN (
          SELECT id::TEXT FROM comments    WHERE user_id = v_target_user
          UNION ALL
          SELECT id::TEXT FROM posts       WHERE user_id = v_target_user
          UNION ALL
          SELECT id::TEXT FROM media_posts WHERE user_id = v_target_user
        );
    -- v_count에 이번 신고도 포함 (AFTER INSERT 트리거)
    IF v_count >= 9 THEN
      UPDATE profiles
        SET comment_banned_until = '9999-12-31'::TIMESTAMPTZ
        WHERE id = v_target_user;
    ELSIF v_count >= 6 THEN
      UPDATE profiles
        SET comment_banned_until = GREATEST(COALESCE(comment_banned_until, now()), now()) + INTERVAL '30 days'
        WHERE id = v_target_user;
    ELSIF v_count >= 3 AND v_count % 3 = 0 THEN
      UPDATE profiles
        SET comment_banned_until = GREATEST(COALESCE(comment_banned_until, now()), now()) + INTERVAL '7 days'
        WHERE id = v_target_user;
    END IF;
    RETURN NEW;
  END IF;

  -- ③ 스팸: 누적 3회→7일, 6회+→30일 게시+댓글 금지
  IF NEW.reason = 'spam' THEN
    SELECT COUNT(*) INTO v_count
      FROM reports r
      WHERE r.reason = 'spam'
        AND r.target_id IN (
          SELECT id::TEXT FROM comments WHERE user_id = v_target_user
          UNION ALL
          SELECT id::TEXT FROM posts    WHERE user_id = v_target_user
        );
    IF v_count >= 6 THEN
      UPDATE profiles
        SET post_banned_until    = GREATEST(COALESCE(post_banned_until,    now()), now()) + INTERVAL '30 days',
            comment_banned_until = GREATEST(COALESCE(comment_banned_until, now()), now()) + INTERVAL '30 days'
        WHERE id = v_target_user;
    ELSIF v_count >= 3 AND v_count % 3 = 0 THEN
      UPDATE profiles
        SET post_banned_until    = GREATEST(COALESCE(post_banned_until,    now()), now()) + INTERVAL '7 days',
            comment_banned_until = GREATEST(COALESCE(comment_banned_until, now()), now()) + INTERVAL '7 days'
        WHERE id = v_target_user;
    END IF;
    RETURN NEW;
  END IF;

  -- ④ 음란물: 누적 2회→30일, 4회+→영구 게시금지
  IF NEW.reason = 'adult' THEN
    SELECT COUNT(*) INTO v_count
      FROM reports r
      WHERE r.reason = 'adult'
        AND r.target_id IN (
          SELECT id::TEXT FROM posts       WHERE user_id = v_target_user
          UNION ALL
          SELECT id::TEXT FROM media_posts WHERE user_id = v_target_user
        );
    IF v_count >= 4 THEN
      UPDATE profiles
        SET post_banned_until = '9999-12-31'::TIMESTAMPTZ
        WHERE id = v_target_user;
    ELSIF v_count >= 2 AND v_count % 2 = 0 THEN
      UPDATE profiles
        SET post_banned_until = GREATEST(COALESCE(post_banned_until, now()), now()) + INTERVAL '30 days'
        WHERE id = v_target_user;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER reports_auto_penalty
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION handle_report_auto_penalty();
