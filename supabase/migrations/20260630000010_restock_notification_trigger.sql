-- 재입고 알림 Postgres Function
CREATE OR REPLACE FUNCTION public.notify_restock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- stock이 0에서 양수로 바뀔 때만 실행
  IF OLD.stock = 0 AND NEW.stock > 0 THEN
    -- 신청자 전원에게 notification insert
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      ra.user_id,
      'restock',
      '''' || NEW.title || ''' 재입고 알림 🔔',
      '신청하신 상품이 재입고되었습니다.',
      '/market/' || NEW.id::text
    FROM public.restock_alerts ra
    WHERE ra.product_id = NEW.id;

    -- 알림 신청 해제 (중복 알림 방지)
    DELETE FROM public.restock_alerts WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 기존 트리거 있으면 삭제 후 재생성 (멱등성)
DROP TRIGGER IF EXISTS trigger_restock_notification ON public.products;

CREATE TRIGGER trigger_restock_notification
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_restock();
