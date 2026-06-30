# Phase 18 — 실시간 알림 트리거 설계

## 개요

`notifications` 테이블, `NotificationBell` UI, Supabase Realtime 구독은 이미 구현 완료.
이 스펙은 **누락된 5개 이벤트 트리거**를 추가하는 작업만 다룬다.

## 아키텍처

```
이벤트 발생 (클라이언트 또는 DB Postgres Function)
       ↓
notifications 테이블 INSERT
       ↓
Supabase Realtime (NotificationBell이 user_id 필터로 이미 구독 중)
       ↓
벨 아이콘 뱃지 업데이트 + 드롭다운 갱신
```

---

## 트리거 1 — 주문 상태 변경 → 구매자 알림

**파일:** `src/app/dashboard/page.tsx`

- `SellerOrder` 인터페이스에 `buyer_user_id: string` 필드 추가
- 판매자 주문 조회 쿼리에서 `orders!inner(id, status, created_at, shipping_name, user_id)` 포함
- `updateOrderStatus` 함수에 orders.update 이후 notification insert 추가
- 상태별 메시지:
  - `preparing` → "주문이 배송 준비 중입니다 📦"
  - `shipping` → "주문이 배송 중입니다 🚚"
  - `delivered` → "주문이 배송 완료되었습니다 ✅"
- `type: 'order'`, `link: '/orders'`
- insert 실패는 조용히 무시 (알림 실패가 배송 처리 UX를 막으면 안 됨)

---

## 트리거 2 — 재입고 → 신청자 일괄 알림 (DB 트리거)

**파일:** `supabase/migrations/20260630000010_restock_notification_trigger.sql`

- `notify_restock()` Postgres Function 생성
  - `products` UPDATE 시 `OLD.stock = 0 AND NEW.stock > 0` 조건 체크
  - `restock_alerts`에서 해당 `product_id` 행 전체 조회
  - `notifications` bulk insert (각 신청자에게 type='restock', link='/market/{product_id}')
  - `restock_alerts`에서 해당 행 삭제 (재알림 방지)
  - SECURITY DEFINER로 실행 (RLS 우회)
- `AFTER UPDATE ON products FOR EACH ROW` 트리거 등록

---

## 트리거 3 — 미디어 좋아요 → 작성자 알림

**파일:** `src/components/ui/LikeButton.tsx`, `src/app/media/[id]/page.tsx`

- `LikeButton`에 `authorId?: string` prop 추가
- `toggle` 함수에서 좋아요 추가 시(`!liked`) 조건:
  - `authorId`가 있고 `authorId !== user.id`일 때만 insert
  - `type: 'like_media'`, `link: '/media/{postId}'`
- `media/[id]/page.tsx`에서 `authorId={p.user_id}` 전달
- 좋아요 취소 시에는 notification 없음

---

## 트리거 4 — 리뷰 등록 → 판매자 알림

**파일:** `src/app/market/[id]/review/page.tsx`

- 상품 쿼리 select에 `seller_id` 추가 (`title, images, seller_id`)
- review insert(신규 작성) 이후에만 notification insert (수정 시 제외)
- 자기 자신 상품 리뷰 제외 (`product.seller_id !== user.id`)
- `type: 'review'`, `link: '/dashboard?tab=seller'`
- 상품명 포함 메시지: `"'${product.title}'에 새 리뷰가 달렸습니다 ⭐"`

---

## 트리거 5 — 주문 취소 → 판매자 알림

**파일:** `src/app/orders/page.tsx`

- `cancelOrder` 함수에서 orders.update 이후 추가 처리:
  - `order_items` + `products(seller_id, title)` JOIN 쿼리로 해당 주문의 판매자 목록 조회
  - 중복 seller_id 제거 후 각 판매자에게 notification insert
  - `type: 'order_cancelled'`, `link: '/dashboard?tab=seller'`
  - 메시지: `"주문이 취소되었습니다 ❌"`

---

## NotificationBell TYPE_ICON 추가

**파일:** `src/components/ui/NotificationBell.tsx`

```ts
review: '⭐',
restock: '🔔',
order_cancelled: '❌',
```

---

## 주의사항

- 모든 클라이언트 사이드 notification insert는 메인 액션 이후 비동기 처리 (`await` 실패해도 에러 버블링 금지)
- DB 트리거는 `SECURITY DEFINER`로 RLS 우회 필수 (notifications insert 정책이 `with check (true)`라 사실 불필요하지만 restock_alerts delete는 RLS 필요)
- 자기 자신에게 알림 발송 금지 (좋아요/리뷰 모두 author 체크)
