# Phase 18 실시간 알림 트리거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `notifications` 테이블과 `NotificationBell` UI가 이미 완성된 상태에서, 누락된 5개 이벤트 트리거를 추가한다.

**Architecture:** 재입고 알림은 Postgres Function + AFTER UPDATE 트리거로 원자적으로 처리하고, 나머지 4개는 기존 코드 패턴(클라이언트 사이드 insert)을 따른다. 모든 notification insert는 메인 액션 이후 비동기 처리하여 실패 시 UX를 막지 않는다.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + Realtime), TypeScript

## Global Constraints

- notification insert 실패가 메인 액션(주문 취소, 리뷰 제출 등)을 막으면 안 됨 — `.then(() => {})` 패턴으로 fire-and-forget
- 자기 자신에게 알림 발송 금지 — authorId/seller_id와 user.id 비교 필수
- 기존 기능(타입스크립트 에러 0, 기존 동작) 유지
- 재입고 트리거는 Supabase SQL Editor에서 수동 실행 (로컬 supabase CLI 없음)

---

## 파일 맵

| 파일 | 작업 |
|------|------|
| `src/components/ui/NotificationBell.tsx` | TYPE_ICON에 review/restock/order_cancelled 추가 |
| `supabase/migrations/20260630000010_restock_notification_trigger.sql` | 재입고 Postgres Function + 트리거 생성 |
| `src/app/dashboard/page.tsx` | SellerOrder 타입 + 쿼리 + updateOrderStatus 수정 |
| `src/components/ui/LikeButton.tsx` | authorId prop 추가 + 좋아요 시 알림 insert |
| `src/app/media/[id]/page.tsx` | LikeButton에 authorId={p.user_id} 전달 |
| `src/app/market/[id]/review/page.tsx` | product 타입 + 쿼리 + 리뷰 insert 후 알림 |
| `src/app/orders/page.tsx` | cancelOrder에 판매자 알림 추가 |

---

## Task 1: NotificationBell TYPE_ICON 확장

**Files:**
- Modify: `src/components/ui/NotificationBell.tsx`

**Interfaces:**
- Produces: `review`, `restock`, `order_cancelled` 타입이 알림 드롭다운에서 이모지로 표시됨

- [ ] **Step 1: TYPE_ICON에 3개 타입 추가**

`src/components/ui/NotificationBell.tsx`의 `TYPE_ICON` 객체를 아래와 같이 수정:

```typescript
const TYPE_ICON: Record<string, string> = {
  like_post: '❤️', like_media: '❤️', comment: '💬', order: '📦',
  inquiry_answered: '💬', review: '⭐', restock: '🔔', order_cancelled: '❌',
  default: '🔔',
};
```

- [ ] **Step 2: TypeScript 에러 확인**

```bash
cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음 (또는 이 파일과 무관한 기존 에러만)

- [ ] **Step 3: 커밋**

```bash
cd ~/Desktop/da-itda
git add src/components/ui/NotificationBell.tsx
git commit -m "feat: NotificationBell TYPE_ICON에 review/restock/order_cancelled 추가"
```

---

## Task 2: 재입고 알림 DB 트리거

**Files:**
- Create: `supabase/migrations/20260630000010_restock_notification_trigger.sql`

**Interfaces:**
- Produces: `products.stock`이 0 → 양수로 바뀌면 `restock_alerts` 신청자 전원에게 notification INSERT + alerts 삭제

- [ ] **Step 1: SQL 마이그레이션 파일 작성**

`supabase/migrations/20260630000010_restock_notification_trigger.sql` 생성:

```sql
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
```

- [ ] **Step 2: Supabase SQL Editor에서 실행**

위 SQL을 Supabase 대시보드 → SQL Editor에 붙여넣고 실행.
성공 메시지 확인: "Success. No rows returned"

- [ ] **Step 3: 동작 수동 검증**

1. 품절 상품에 재입고 알림 신청 (RestockAlertButton으로)
2. Supabase SQL Editor에서 해당 상품 stock을 0 → 양수로 수동 업데이트:
   ```sql
   UPDATE products SET stock = 10 WHERE id = '<product_id>';
   ```
3. NotificationBell에 '🔔 재입고 알림'이 나타나는지 확인
4. `restock_alerts` 행이 삭제됐는지 확인:
   ```sql
   SELECT * FROM restock_alerts WHERE product_id = '<product_id>';
   ```
   Expected: 0 rows

- [ ] **Step 4: 커밋**

```bash
cd ~/Desktop/da-itda
git add supabase/migrations/20260630000010_restock_notification_trigger.sql
git commit -m "feat: 재입고 알림 DB 트리거 추가 (Postgres Function)"
```

---

## Task 3: 주문 상태 변경 → 구매자 알림

**Files:**
- Modify: `src/app/dashboard/page.tsx:63-70` (SellerOrder interface), `:336-342` (쿼리), `:1007-1013` (updateOrderStatus)

**Interfaces:**
- Consumes: 없음 (기존 SellerOrder 상태 활용)
- Produces: 판매자가 배송상태 변경 시 구매자 NotificationBell에 알림 도착

- [ ] **Step 1: SellerOrder 인터페이스에 buyer_user_id 추가**

`src/app/dashboard/page.tsx`의 `SellerOrder` 인터페이스 수정 (line ~63):

```typescript
interface SellerOrder {
  order_id: string;
  status: string;
  created_at: string;
  buyer_name: string | null;
  buyer_user_id: string;
  items: { title: string; quantity: number; selected_color: string | null }[];
}
```

- [ ] **Step 2: 판매자 주문 쿼리에 user_id 추가**

line ~337의 쿼리 select 문자열 수정:

```typescript
// 기존
.select('order_id, title, quantity, selected_color, products!inner(seller_id), orders!inner(id, status, created_at, shipping_name)')

// 변경
.select('order_id, title, quantity, selected_color, products!inner(seller_id), orders!inner(id, status, created_at, shipping_name, user_id)')
```

- [ ] **Step 3: orderMap 생성 시 buyer_user_id 포함**

line ~347의 `orderMap[oid] = { ... }` 블록 수정:

```typescript
orderMap[oid] = {
  order_id:      oid,
  status:        r.orders?.status ?? '',
  created_at:    r.orders?.created_at ?? '',
  buyer_name:    r.orders?.shipping_name ?? null,
  buyer_user_id: r.orders?.user_id ?? '',
  items: [],
};
```

- [ ] **Step 4: updateOrderStatus에 알림 insert 추가**

line ~1007의 `updateOrderStatus` 함수 전체 교체:

```typescript
const updateOrderStatus = async (orderId: string, status: string) => {
  setOrderStatusUpdating(orderId);
  await supabase.from('orders').update({ status }).eq('id', orderId);

  const order = sellerOrders.find((o) => o.order_id === orderId);
  if (order?.buyer_user_id) {
    const statusMsg: Record<string, string> = {
      preparing: '주문이 배송 준비 중입니다 📦',
      shipping:  '주문이 배송 중입니다 🚚',
      delivered: '주문이 배송 완료되었습니다 ✅',
    };
    if (statusMsg[status]) {
      supabase.from('notifications').insert({
        user_id: order.buyer_user_id,
        type: 'order',
        title: statusMsg[status],
        link: '/orders',
      }).then(() => {});
    }
  }

  setSellerOrders((prev) => prev.map((o) => o.order_id === orderId ? { ...o, status } : o));
  setOrderStatusUpdating(null);
};
```

- [ ] **Step 5: TypeScript 에러 확인**

```bash
cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 6: 수동 검증**

1. 판매자 계정으로 대시보드 → 판매 정산 탭
2. 주문 상태를 '배송준비'로 변경
3. 구매자 계정 NotificationBell에 "주문이 배송 준비 중입니다 📦" 알림 확인
4. 배송중 → 배송완료 순서로도 확인

- [ ] **Step 7: 커밋**

```bash
cd ~/Desktop/da-itda
git add src/app/dashboard/page.tsx
git commit -m "feat: 주문 상태 변경 시 구매자 알림 발송"
```

---

## Task 4: 미디어 좋아요 → 작성자 알림

**Files:**
- Modify: `src/components/ui/LikeButton.tsx`
- Modify: `src/app/media/[id]/page.tsx`

**Interfaces:**
- Consumes: `media_posts.user_id` (서버 컴포넌트에서 props로 전달)
- Produces: 다른 사람이 좋아요 시 작성자 NotificationBell에 '❤️ like_media' 알림

- [ ] **Step 1: LikeButton에 authorId prop 추가**

`src/components/ui/LikeButton.tsx`의 Props 인터페이스와 컴포넌트 시그니처 수정:

```typescript
interface Props {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
  authorId?: string;
}

export default function LikeButton({ postId, initialCount, initialLiked, authorId }: Props) {
```

- [ ] **Step 2: toggle 함수에서 좋아요 추가 시 알림 insert**

`toggle` 함수의 `else` 블록(좋아요 추가 부분)에 알림 추가:

```typescript
} else {
  await supabase.from('media_likes').insert({ user_id: user.id, post_id: postId });
  setLiked(true);
  setCount((c) => c + 1);
  if (authorId && authorId !== user.id) {
    supabase.from('notifications').insert({
      user_id: authorId,
      type: 'like_media',
      title: '회원님의 영상을 좋아합니다 ❤️',
      link: `/media/${postId}`,
    }).then(() => {});
  }
}
```

- [ ] **Step 3: media/[id]/page.tsx에서 authorId 전달**

`src/app/media/[id]/page.tsx`의 `<LikeButton>` 사용 부분에 `authorId` 추가:

```typescript
// 기존
<LikeButton postId={p.id} initialCount={likeCount ?? 0} initialLiked={false} />

// 변경
<LikeButton postId={p.id} initialCount={likeCount ?? 0} initialLiked={false} authorId={p.user_id} />
```

- [ ] **Step 4: TypeScript 에러 확인**

```bash
cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 5: 수동 검증**

1. 미디어 영상 상세 페이지에서 다른 계정으로 로그인 후 좋아요 클릭
2. 영상 작성자 계정의 NotificationBell에 "회원님의 영상을 좋아합니다 ❤️" 알림 확인
3. 자기 자신이 좋아요 시 알림 미발송 확인

- [ ] **Step 6: 커밋**

```bash
cd ~/Desktop/da-itda
git add src/components/ui/LikeButton.tsx src/app/media/\[id\]/page.tsx
git commit -m "feat: 미디어 좋아요 시 작성자 알림 발송"
```

---

## Task 5: 리뷰 등록 → 판매자 알림

**Files:**
- Modify: `src/app/market/[id]/review/page.tsx`

**Interfaces:**
- Consumes: `products.seller_id` (기존 쿼리에 필드 추가)
- Produces: 새 리뷰 작성 시 판매자 NotificationBell에 '⭐ review' 알림

- [ ] **Step 1: product 상태 타입에 seller_id 추가**

`src/app/market/[id]/review/page.tsx` line ~19의 state 타입 수정:

```typescript
// 기존
const [product, setProduct] = useState<{ title: string; images: string[] } | null>(null);

// 변경
const [product, setProduct] = useState<{ title: string; images: string[]; seller_id: string } | null>(null);
```

- [ ] **Step 2: 상품 쿼리 select에 seller_id 추가**

line ~38의 products 쿼리 수정:

```typescript
// 기존
.from('products').select('title, images').eq('id', productId).single();

// 변경
.from('products').select('title, images, seller_id').eq('id', productId).single();
```

- [ ] **Step 3: setProduct cast 타입 수정**

line ~39의 cast 수정:

```typescript
// 기존
setProduct(prod as { title: string; images: string[] });

// 변경
setProduct(prod as { title: string; images: string[]; seller_id: string });
```

- [ ] **Step 4: 리뷰 신규 insert 이후 판매자 알림 추가**

`src/app/market/[id]/review/page.tsx`에서 리뷰 insert (신규 작성) 블록 — `existingReview`가 없는 분기의 insert 성공 이후에 추가:

```typescript
// 기존 코드 (insert 성공 후 router.push 전):
// } else {
//   const { error: err } = await supabase.from('reviews').insert({ ... });
//   if (err) { setError(err.message); setSubmitting(false); return; }
// }
// router.push(...)

// 변경: insert 블록 전체
} else {
  const { error: err } = await supabase.from('reviews').insert({
    product_id: productId,
    user_id: user.id,
    rating,
    content: content.trim() || null,
    ...(images ? { images } : {}),
  });
  if (err) { setError(err.message); setSubmitting(false); return; }

  // 판매자 알림 (자기 자신 상품 제외)
  if (product?.seller_id && product.seller_id !== user.id) {
    supabase.from('notifications').insert({
      user_id: product.seller_id,
      type: 'review',
      title: `'${product.title}'에 새 리뷰가 달렸습니다 ⭐`,
      link: '/dashboard?tab=seller',
    }).then(() => {});
  }
}
```

- [ ] **Step 5: TypeScript 에러 확인**

```bash
cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 6: 수동 검증**

1. 구매자 계정으로 배송완료 상품에 리뷰 작성
2. 판매자 계정 NotificationBell에 "'상품명'에 새 리뷰가 달렸습니다 ⭐" 알림 확인
3. 기존 리뷰 수정 시 판매자 알림 미발송 확인

- [ ] **Step 7: 커밋**

```bash
cd ~/Desktop/da-itda
git add src/app/market/\[id\]/review/page.tsx
git commit -m "feat: 리뷰 등록 시 판매자 알림 발송"
```

---

## Task 6: 주문 취소 → 판매자 알림

**Files:**
- Modify: `src/app/orders/page.tsx:165-168` (cancelOrder 함수)

**Interfaces:**
- Consumes: `order_items` + `products(seller_id)` 조인 쿼리
- Produces: 구매자가 주문 취소 시 해당 주문의 판매자(들) NotificationBell에 '❌ order_cancelled' 알림

- [ ] **Step 1: cancelOrder 함수에 판매자 알림 추가**

`src/app/orders/page.tsx`의 `cancelOrder` 함수 전체 교체 (line ~165):

```typescript
const cancelOrder = async (orderId: string) => {
  await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);

  // 해당 주문의 판매자 목록 조회 후 알림 발송
  const { data: items } = await supabase
    .from('order_items')
    .select('products!inner(seller_id)')
    .eq('order_id', orderId);

  if (items && items.length > 0) {
    const sellerIds = [
      ...new Set(
        (items as { products: { seller_id: string } }[])
          .map((i) => i.products?.seller_id)
          .filter(Boolean)
      ),
    ];
    sellerIds.forEach((sellerId) => {
      supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'order_cancelled',
        title: '주문이 취소되었습니다 ❌',
        link: '/dashboard?tab=seller',
      }).then(() => {});
    });
  }

  setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'cancelled' } : o));
  setCancellingId(null);
};
```

- [ ] **Step 2: TypeScript 에러 확인**

```bash
cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 수동 검증**

1. 구매자 계정으로 '결제완료' 상태 주문 취소
2. 판매자 계정 NotificationBell에 "주문이 취소되었습니다 ❌" 알림 확인
3. 주문 목록에서 해당 주문이 '취소됨' 상태로 정상 표시되는지 확인

- [ ] **Step 4: 커밋**

```bash
cd ~/Desktop/da-itda
git add src/app/orders/page.tsx
git commit -m "feat: 주문 취소 시 판매자 알림 발송"
```

---

## Task 7: 전체 통합 검증 및 Obsidian 기록

- [ ] **Step 1: TypeScript 전체 빌드 확인**

```bash
cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1
```

Expected: 에러 없음

- [ ] **Step 2: Next.js 빌드 확인**

```bash
cd ~/Desktop/da-itda && npm run build 2>&1 | tail -20
```

Expected: 빌드 성공 (✓ Compiled successfully)

- [ ] **Step 3: 알림 타입 전체 동작 목록 최종 확인**

| 트리거 | 수신자 | 타입 | 상태 |
|--------|--------|------|------|
| 게시글 댓글 | 게시글 작성자 | comment | ✅ 기존 |
| 게시글 좋아요 | 게시글 작성자 | like_post | ✅ 기존 |
| 주문 완료 | 판매자 | order | ✅ 기존 |
| 문의 답변 | 구매자 | inquiry_answered | ✅ 기존 |
| 주문 상태 변경 | 구매자 | order | ✅ Task 3 |
| 재입고 | 알림 신청자 | restock | ✅ Task 2 |
| 미디어 좋아요 | 미디어 작성자 | like_media | ✅ Task 4 |
| 리뷰 등록 | 판매자 | review | ✅ Task 5 |
| 주문 취소 | 판매자 | order_cancelled | ✅ Task 6 |

- [ ] **Step 4: Obsidian daily note 업데이트**

`~/obsidian-vault/daily/2026-06-30.md` 생성 후 Phase 18 작업 내용 기록

- [ ] **Step 5: 최종 push**

```bash
cd ~/Desktop/da-itda && git push origin main
```
