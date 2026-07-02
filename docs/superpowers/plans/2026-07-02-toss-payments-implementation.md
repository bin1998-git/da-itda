# 토스페이먼츠 v2 결제 연동 (Phase 21) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 장바구니의 가짜 결제(즉시 `status:'paid'` INSERT)를 토스페이먼츠 결제창(API 개별연동, `@tosspayments/payment-sdk`) 기반 실제 카드 결제 승인으로 교체하고, 결제 성공 시에만 재고를 차감하며, 판매자가 부분/전체 환불을 처리할 수 있게 한다.

**Architecture:** 장바구니에서 `orders`를 `status:'pending'`으로 먼저 생성 → 토스 결제창 호출 → 결제 성공 시 토스가 `/payments/success`로 리다이렉트 → 서버가 결제 승인(confirm) API로 진짜 승인 여부를 확인하고, 통과하면 재고 차감(원자적) + 쿠폰 확정 + 주문 `paid` 전환. 결제 승인/재고 확보 같은 신뢰된 서버 작업은 Supabase **서비스 롤 키**로 RLS를 우회해 처리한다 (이 저장소엔 쿠키 기반 SSR 세션 연동이 없어서, 클라이언트 세션에 의존하지 않는 이 방식이 가장 견고함).

**Tech Stack:** `@tosspayments/payment-sdk` (결제창 v1, API 개별연동 키 — 사업자등록 불필요), Next.js Route Handler/서버 컴포넌트, Supabase (Postgres RPC + service role client).

## Global Constraints

- 시크릿 키(`TOSS_SECRET_KEY`)와 서비스 롤 키(`SUPABASE_SERVICE_ROLE_KEY`)는 절대 클라이언트 번들에 포함하지 않는다 (`NEXT_PUBLIC_` 접두사 금지, 서버 파일에서만 `process.env`로 참조).
- 결제 금액은 토스가 successUrl로 보낸 `amount` 쿼리파라미터를 그대로 믿지 않고, 반드시 DB에 저장된 `orders.total_amount`와 비교 후 불일치 시 승인 거부한다.
- 재고 차감은 결제 승인 성공 이후에만 일어난다. 재고 부족 시 이미 승인된 결제를 즉시 자동 취소한다.
- 이 저장소에는 자동화 테스트 러너가 없다. 각 태스크 검증은 `npm run build`(타입체크)와 토스 테스트 환경에서의 실제 브라우저 결제로 한다. 테스트 환경에서는 카드번호 앞 6자리(BIN)만 유효하면 임의 번호로 결제가 되고, 휴대폰 인증번호는 `000000`을 입력하면 통과한다.
- `profiles`를 조인해야 하는 새 쿼리를 추가할 경우, 반드시 해당 테이블의 FK가 `public.profiles`를 가리키는지(=`auth.users`가 아닌지) 먼저 확인한다. (오늘 발견된 버그 재발 방지)

## 필요한 환경변수 (사용자가 `.env.local`에 직접 설정)

- `NEXT_PUBLIC_TOSS_CLIENT_KEY` — 이미 설정됨
- `TOSS_SECRET_KEY` — 이미 설정됨
- `SUPABASE_SERVICE_ROLE_KEY` — **신규 필요**. Supabase 대시보드 → Project Settings → API → `service_role` 키 (`anon` 키와는 다름, 절대 공개 금지)

---

### Task 1: DB 마이그레이션 — orders 컬럼, 커미션 트리거 재정의, 재고/쿠폰 RPC

**Files:**
- Create: `supabase/migrations/20260702000020_toss_payments.sql`

**Interfaces:**
- Produces: `orders.payment_key`, `orders.paid_at`, `orders.fail_reason`, `orders.refunded_amount` 컬럼. `decrement_stock(p_product_id uuid, p_qty integer) returns boolean`, `restore_stock(p_product_id uuid, p_qty integer) returns void`, `increment_coupon_used(p_coupon_id uuid) returns void` RPC 함수. `trigger_creator_commission`을 orders INSERT가 아닌 "status가 paid로 바뀌는 UPDATE" 시점에 발동하도록 재정의.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 결제 관련 컬럼 추가
alter table public.orders
  add column if not exists payment_key text,
  add column if not exists paid_at timestamptz,
  add column if not exists fail_reason text,
  add column if not exists refunded_amount integer not null default 0;

-- 크리에이터 커미션 트리거: INSERT 시점 → status가 'paid'로 바뀌는 UPDATE 시점으로 이동
-- (이제 orders는 'pending'으로 먼저 생성되고, 결제 승인 후에만 'paid'가 됨)
drop trigger if exists trigger_creator_commission on public.orders;

create trigger trigger_creator_commission
after update of status on public.orders
for each row
when (new.status = 'paid' and old.status is distinct from 'paid')
execute function public.credit_creator_commission();

-- 재고 원자적 차감: 재고 부족 시 false 반환, 부족하지 않으면 차감 후 true
create or replace function public.decrement_stock(p_product_id uuid, p_qty integer)
returns boolean
language plpgsql
security definer
as $$
declare
  v_updated integer;
begin
  update public.products
  set stock = stock - p_qty
  where id = p_product_id and stock >= p_qty;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- 환불/자동취소 시 재고 원복
create or replace function public.restore_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
as $$
begin
  update public.products set stock = stock + p_qty where id = p_product_id;
end;
$$;

-- 쿠폰 사용횟수 원자적 증가 (결제 승인 후 서버에서 호출)
create or replace function public.increment_coupon_used(p_coupon_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.coupons set used_count = used_count + 1 where id = p_coupon_id;
end;
$$;
```

- [ ] **Step 2: Supabase에 반영**

Run: `cd ~/Desktop/da-itda && supabase db push --linked --yes`
Expected: `Applying migration 20260702000020_toss_payments.sql...` 후 `Finished supabase db push.`

- [ ] **Step 3: 반영 확인**

Run: `supabase db query "select column_name from information_schema.columns where table_name='orders' and column_name in ('payment_key','paid_at','fail_reason','refunded_amount');" --linked`
Expected: 4개 컬럼 모두 조회됨.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260702000020_toss_payments.sql
git commit -m "feat: 토스페이먼츠 연동을 위한 orders 컬럼/RPC/트리거 재정의"
```

---

### Task 2: 서비스 롤 클라이언트 + 토스 API 유틸

**Files:**
- Create: `src/lib/supabaseAdmin.ts`
- Create: `src/lib/toss.ts`
- Modify: `package.json` (SDK 설치)

**Interfaces:**
- Produces: `supabaseAdmin()` — RLS를 우회하는 서비스 롤 Supabase 클라이언트. `confirmTossPayment(paymentKey: string, orderId: string, amount: number): Promise<{ ok: boolean; message?: string }>`, `cancelTossPayment(paymentKey: string, cancelReason: string, cancelAmount?: number): Promise<{ ok: boolean; message?: string }>`.이후 Task 4, 7이 이 함수들을 그대로 호출한다.

- [ ] **Step 1: SDK 설치**

```bash
cd ~/Desktop/da-itda && npm install @tosspayments/payment-sdk
```

- [ ] **Step 2: `src/lib/supabaseAdmin.ts` 작성**

```ts
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export function supabaseAdmin() {
  return client;
}
```

- [ ] **Step 3: `src/lib/toss.ts` 작성**

```ts
const TOSS_API = 'https://api.tosspayments.com/v1/payments';

function authHeader() {
  const key = process.env.TOSS_SECRET_KEY!;
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
}

export interface TossResult {
  ok: boolean;
  status?: string;
  message?: string;
}

export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossResult> {
  const res = await fetch(`${TOSS_API}/confirm`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, message: data.message ?? '결제 승인에 실패했습니다.' };
  return { ok: true, status: data.status };
}

export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number,
): Promise<TossResult> {
  const res = await fetch(`${TOSS_API}/${paymentKey}/cancel`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(cancelAmount != null ? { cancelReason, cancelAmount } : { cancelReason }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, message: data.message ?? '결제 취소에 실패했습니다.' };
  return { ok: true, status: data.status };
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: `✓ Compiled successfully` (아직 아무도 이 파일들을 안 쓰므로 에러 없음).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/supabaseAdmin.ts src/lib/toss.ts
git commit -m "feat: 토스페이먼츠 SDK 설치 + 서버 유틸(confirm/cancel, 서비스 롤 클라이언트)"
```

---

### Task 3: 장바구니 — 주문 생성(pending) 후 토스 결제창 호출

**Files:**
- Modify: `src/app/cart/page.tsx`

**Interfaces:**
- Consumes: `loadTossPayments` (`@tosspayments/payment-sdk`).
- Produces: `orders` 행이 `status: 'pending'`으로 생성되고 `order_items`가 함께 INSERT됨. Task 4의 `/payments/success`가 이 `orders.id`를 `orderId`로 받아 처리한다.

- [ ] **Step 1: import 추가**

`src/app/cart/page.tsx` 상단에서:
```ts
import AddressInput from '@/components/ui/AddressInput';
```
바로 아래에 추가:
```ts
import { loadTossPayments } from '@tosspayments/payment-sdk';
```

- [ ] **Step 2: `purchased` state 및 구매완료 화면 제거**

이제 구매 완료는 `/payments/success` 페이지가 담당하므로, 기존 인라인 완료 화면은 죽은 코드가 된다.

기존:
```ts
  const [purchased, setPurchased]   = useState(false);
  const [purchasing, setPurchasing] = useState(false);
```
변경 후:
```ts
  const [purchasing, setPurchasing] = useState(false);
```

기존 (파일 내 "/* ── 구매 완료 ── */" 블록 전체, `if (purchased) { ... }`)을 통째로 삭제한다.

- [ ] **Step 3: `handlePurchase` 교체**

기존:
```ts
  const handlePurchase = async () => {
    if (!user) return;

    // 배송 정보 검증
    if (!shipping.name.trim() || !shipping.phone.trim() || !shipping.address.trim()) {
      setShippingError('이름, 전화번호, 주소를 모두 입력해주세요.');
      document.getElementById('shipping-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setShippingError('');
    setPurchasing(true);

    if (coupon) {
      await supabase.rpc('apply_coupon', { p_coupon_id: coupon.id });
      const updated = mySaved.filter((s) => s.code !== coupon.code);
      setMySaved(updated);
      localStorage.setItem('saved_coupons', JSON.stringify(updated));
    }

    // 주문 생성
    const referralMediaId = localStorage.getItem('referral_media_id') ?? null;
    const { data: order } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'paid',
        total_amount: total,
        discount_amount: discount,
        coupon_code: coupon?.code ?? null,
        shipping_name: shipping.name.trim(),
        shipping_phone: shipping.phone.trim(),
        shipping_address: shipping.address.trim(),
        shipping_detail: shipping.detail.trim() || null,
        referral_media_id: referralMediaId,
      })
      .select('id')
      .single();

    if (order) {
      const orderItems = items
        .filter((i) => i.products)
        .map((i) => ({
          order_id: order.id,
          product_id: i.products!.id,
          title: i.products!.title,
          price: i.products!.price,
          quantity: i.quantity,
          image_url: i.products!.images?.[0] ?? null,
          selected_color: i.selected_color ?? null,
        }));
      if (orderItems.length > 0) {
        await supabase.from('order_items').insert(orderItems);
      }
      // 주문 완료 알림
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'order',
        title: `주문이 완료됐습니다 (${total.toLocaleString('ko-KR')}원)`,
        body: `${items.length}개 상품`,
        link: '/orders',
      });
    }

    await supabase.from('cart_items').delete().eq('user_id', user.id);
    localStorage.removeItem('referral_media_id');
    setItems([]);
    setCoupon(null);
    setCouponInput('');
    setPurchasing(false);
    setPurchased(true);
  };
```

변경 후:
```ts
  const handlePurchase = async () => {
    if (!user) return;

    // 배송 정보 검증
    if (!shipping.name.trim() || !shipping.phone.trim() || !shipping.address.trim()) {
      setShippingError('이름, 전화번호, 주소를 모두 입력해주세요.');
      document.getElementById('shipping-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setShippingError('');
    setPurchasing(true);

    // 주문 생성 (결제 승인 전이므로 'pending'. 쿠폰 사용/재고 차감/알림은
    // 결제 승인 후 /payments/success 에서 처리한다)
    const referralMediaId = localStorage.getItem('referral_media_id') ?? null;
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        total_amount: total,
        discount_amount: discount,
        coupon_code: coupon?.code ?? null,
        shipping_name: shipping.name.trim(),
        shipping_phone: shipping.phone.trim(),
        shipping_address: shipping.address.trim(),
        shipping_detail: shipping.detail.trim() || null,
        referral_media_id: referralMediaId,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      setShippingError('주문 생성에 실패했습니다. 다시 시도해주세요.');
      setPurchasing(false);
      return;
    }

    const orderItems = items
      .filter((i) => i.products)
      .map((i) => ({
        order_id: order.id,
        product_id: i.products!.id,
        title: i.products!.title,
        price: i.products!.price,
        quantity: i.quantity,
        image_url: i.products!.images?.[0] ?? null,
        selected_color: i.selected_color ?? null,
      }));
    if (orderItems.length > 0) {
      await supabase.from('order_items').insert(orderItems);
    }

    const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
    const first = items[0]?.products?.title ?? '다잇다 주문';
    const orderName = items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;

    try {
      await tossPayments.requestPayment('카드', {
        amount: total,
        orderId: order.id,
        orderName,
        customerName: shipping.name.trim(),
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
      });
    } catch {
      // 사용자가 결제창을 취소했거나 즉시 실패한 경우 — 장바구니로 그대로 복귀
      setPurchasing(false);
    }
  };
```

- [ ] **Step 4: "구매하기" 버튼 텍스트 확인**

기존 버튼(`{purchasing ? '처리 중...' : ...}`)은 변경 불필요 — `purchasing`은 그대로 유지된다.

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: `✓ Compiled successfully`. `purchased` 미사용 경고가 없는지 확인 (Step 2에서 완전히 제거했는지 체크).

- [ ] **Step 6: Commit**

```bash
git add src/app/cart/page.tsx
git commit -m "feat: 장바구니 결제를 토스페이먼츠 결제창 호출로 전환"
```

---

### Task 4: 결제 성공/실패 콜백 페이지

**Files:**
- Create: `src/app/payments/success/page.tsx`
- Create: `src/app/payments/fail/page.tsx`

**Interfaces:**
- Consumes: `supabaseAdmin` (Task 2), `confirmTossPayment`/`cancelTossPayment` (Task 2), `decrement_stock`/`restore_stock`/`increment_coupon_used` RPC (Task 1).

- [ ] **Step 1: `src/app/payments/success/page.tsx` 작성**

```tsx
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { confirmTossPayment, cancelTossPayment } from '@/lib/toss';

function ResultView({ ok, message }: { ok: boolean; message: string }) {
  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-6">
        <span className="text-6xl block mb-6">{ok ? '🎉' : '😥'}</span>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">
          {ok ? '주문이 완료됐습니다!' : '결제를 완료하지 못했어요'}
        </h2>
        <p className="text-stone-400 dark:text-white/40 text-sm mb-8">{message}</p>
        <div className="flex flex-col gap-3">
          <Link
            href={ok ? '/orders' : '/cart'}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition text-center"
          >
            {ok ? '주문 내역 확인' : '장바구니로 돌아가기'}
          </Link>
          <Link
            href="/market"
            className="px-6 py-3 rounded-xl border border-black/15 dark:border-white/15 text-stone-700 dark:text-white/70 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            계속 쇼핑하기
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;

  if (!paymentKey || !orderId || !amount) {
    return <ResultView ok={false} message="잘못된 결제 요청입니다." />;
  }

  const db = supabaseAdmin();

  const { data: order } = await db
    .from('orders')
    .select('id, user_id, total_amount, coupon_code, status')
    .eq('id', orderId)
    .single();

  if (!order || order.status !== 'pending') {
    return <ResultView ok={false} message="이미 처리되었거나 존재하지 않는 주문입니다." />;
  }

  if (Number(amount) !== order.total_amount) {
    return <ResultView ok={false} message="결제 금액이 일치하지 않습니다." />;
  }

  const confirm = await confirmTossPayment(paymentKey, orderId, order.total_amount);
  if (!confirm.ok) {
    await db.from('orders').update({ status: 'failed', fail_reason: confirm.message }).eq('id', orderId);
    return <ResultView ok={false} message={confirm.message ?? '결제 승인에 실패했습니다.'} />;
  }

  // 재고 차감 (원자적). 하나라도 품절이면 지금까지 차감분 롤백 + 결제 자동 취소
  const { data: orderItems } = await db
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId);

  const decremented: { product_id: string; quantity: number }[] = [];
  let stockOk = true;
  for (const item of orderItems ?? []) {
    const { data: didDecrement } = await db.rpc('decrement_stock', {
      p_product_id: item.product_id,
      p_qty: item.quantity,
    });
    if (!didDecrement) { stockOk = false; break; }
    decremented.push(item);
  }

  if (!stockOk) {
    for (const item of decremented) {
      await db.rpc('restore_stock', { p_product_id: item.product_id, p_qty: item.quantity });
    }
    await cancelTossPayment(paymentKey, '재고 부족으로 자동 환불');
    await db.from('orders')
      .update({ status: 'failed', fail_reason: '재고 부족으로 자동 환불되었습니다.' })
      .eq('id', orderId);
    return <ResultView ok={false} message="일부 상품이 품절되어 결제가 자동 환불되었습니다." />;
  }

  // 쿠폰 사용 확정
  if (order.coupon_code) {
    const { data: couponRow } = await db
      .from('coupons').select('id').eq('code', order.coupon_code).maybeSingle();
    if (couponRow) {
      await db.from('coupon_uses').insert({ coupon_id: couponRow.id, user_id: order.user_id });
      await db.rpc('increment_coupon_used', { p_coupon_id: couponRow.id });
    }
  }

  await db.from('orders').update({
    status: 'paid',
    payment_key: paymentKey,
    paid_at: new Date().toISOString(),
  }).eq('id', orderId);

  await db.from('cart_items').delete().eq('user_id', order.user_id);

  await db.from('notifications').insert({
    user_id: order.user_id,
    type: 'order',
    title: `주문이 완료됐습니다 (${order.total_amount.toLocaleString('ko-KR')}원)`,
    body: `${(orderItems ?? []).length}개 상품`,
    link: '/orders',
  });

  return <ResultView ok={true} message="결제가 정상 처리됐습니다. 이용해주셔서 감사합니다." />;
}
```

- [ ] **Step 2: `src/app/payments/fail/page.tsx` 작성**

```tsx
import Link from 'next/link';

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20 flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-6">
        <span className="text-6xl block mb-6">😥</span>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">결제에 실패했어요</h2>
        <p className="text-stone-400 dark:text-white/40 text-sm mb-8">
          {message ?? '결제가 취소되었거나 실패했습니다.'}
        </p>
        <Link
          href="/cart"
          className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition inline-block"
        >
          장바구니로 돌아가기
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: `✓ Compiled successfully`, `/payments/success`, `/payments/fail` 라우트 포함.

- [ ] **Step 4: 실제 테스트 결제로 검증**

Run: `npm run dev`, 브라우저로 로그인 후 장바구니에 상품 담고 "구매하기" 클릭.
- 토스 결제창이 뜨면 카드 결제 선택, 임의의 16자리 카드번호(테스트 환경이라 앞 6자리만 유효하면 통과) + 유효기간 + CVC 입력, 휴대폰 인증번호 `000000` 입력
- 결제 완료 → `/payments/success`로 리다이렉트 → "주문이 완료됐습니다!" 화면 확인
- `/orders`에서 방금 주문이 보이는지, 상품 재고가 실제로 줄었는지(`supabase db query "select stock from products where id='...'"`) 확인

- [ ] **Step 5: Commit**

```bash
git add src/app/payments/
git commit -m "feat: 결제 성공/실패 콜백 페이지 — 승인 확인, 재고차감, 쿠폰확정, 자동환불"
```

---

### Task 5: 판매자 주문 목록에서 결제 정보 조회 + pending/failed 주문 제외

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Produces: `SellerOrder`에 `payment_key`, `total_amount`, `refunded_amount` 필드 추가. Task 7의 환불 버튼이 이 필드들을 사용한다.

- [ ] **Step 1: `SellerOrder` 인터페이스 확장**

`src/app/dashboard/page.tsx`의 기존:
```ts
interface SellerOrder {
  order_id: string;
  status: string;
  created_at: string;
  buyer_name: string | null;
  buyer_user_id: string;
  items: { title: string; quantity: number; selected_color: string | null }[];
}
```
변경 후:
```ts
interface SellerOrder {
  order_id: string;
  status: string;
  created_at: string;
  buyer_name: string | null;
  buyer_user_id: string;
  payment_key: string | null;
  total_amount: number;
  refunded_amount: number;
  items: { title: string; quantity: number; selected_color: string | null }[];
}
```

- [ ] **Step 2: 주문 조회 쿼리 수정**

기존:
```ts
      supabase.from('order_items')
        .select('order_id, title, quantity, selected_color, products!inner(seller_id), orders!inner(id, status, created_at, shipping_name, user_id)')
        .eq('products.seller_id', user.id)
        .neq('orders.status', 'cancelled')
        .then(({ data }) => {
          const rows = (data ?? []) as any[];
          const orderMap: Record<string, SellerOrder> = {};
          rows.forEach((r) => {
            const oid = r.order_id;
            if (!orderMap[oid]) {
              orderMap[oid] = {
                order_id:      oid,
                status:        r.orders?.status ?? '',
                created_at:    r.orders?.created_at ?? '',
                buyer_name:    r.orders?.shipping_name ?? null,
                buyer_user_id: r.orders?.user_id ?? '',
                items: [],
              };
            }
            orderMap[oid].items.push({
              title:          r.title,
              quantity:       r.quantity,
              selected_color: r.selected_color ?? null,
            });
          });
          setSellerOrders(Object.values(orderMap).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setTabLoading(false);
        });
```
변경 후:
```ts
      supabase.from('order_items')
        .select('order_id, title, quantity, selected_color, products!inner(seller_id), orders!inner(id, status, created_at, shipping_name, user_id, payment_key, total_amount, refunded_amount)')
        .eq('products.seller_id', user.id)
        .neq('orders.status', 'cancelled')
        .neq('orders.status', 'pending')
        .neq('orders.status', 'failed')
        .then(({ data }) => {
          const rows = (data ?? []) as any[];
          const orderMap: Record<string, SellerOrder> = {};
          rows.forEach((r) => {
            const oid = r.order_id;
            if (!orderMap[oid]) {
              orderMap[oid] = {
                order_id:        oid,
                status:          r.orders?.status ?? '',
                created_at:      r.orders?.created_at ?? '',
                buyer_name:      r.orders?.shipping_name ?? null,
                buyer_user_id:   r.orders?.user_id ?? '',
                payment_key:     r.orders?.payment_key ?? null,
                total_amount:    r.orders?.total_amount ?? 0,
                refunded_amount: r.orders?.refunded_amount ?? 0,
                items: [],
              };
            }
            orderMap[oid].items.push({
              title:          r.title,
              quantity:       r.quantity,
              selected_color: r.selected_color ?? null,
            });
          });
          setSellerOrders(Object.values(orderMap).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setTabLoading(false);
        });
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: 판매자 주문 조회에 결제정보 포함 + pending/failed 주문 제외"
```

---

### Task 6: 환불 API 라우트

**Files:**
- Create: `src/app/api/payments/cancel/route.ts`

**Interfaces:**
- Consumes: `supabaseAdmin` (Task 2), `cancelTossPayment` (Task 2), `restore_stock` RPC (Task 1).
- Produces: `POST /api/payments/cancel` — body `{ orderId: string; amount: number; reason: string }`, header `Authorization: Bearer <access_token>`. 응답 `{ ok: true, fullyRefunded: boolean }` 또는 `{ error: string }`. Task 7의 대시보드 환불 모달이 이 엔드포인트를 호출한다.

- [ ] **Step 1: 라우트 작성**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cancelTossPayment } from '@/lib/toss';

export async function POST(req: NextRequest) {
  const { orderId, amount, reason } = await req.json();

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: order } = await db
    .from('orders')
    .select('id, payment_key, total_amount, refunded_amount, status, user_id')
    .eq('id', orderId)
    .single();

  if (!order || !order.payment_key) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: sellerCheck } = await db
    .from('order_items')
    .select('id, products!inner(seller_id)')
    .eq('order_id', orderId)
    .eq('products.seller_id', user.id)
    .limit(1);

  if (!sellerCheck || sellerCheck.length === 0) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const remaining = order.total_amount - order.refunded_amount;
  if (!amount || amount <= 0 || amount > remaining) {
    return NextResponse.json({ error: '환불 금액이 올바르지 않습니다.' }, { status: 400 });
  }

  const cancel = await cancelTossPayment(order.payment_key, reason || '판매자 환불', amount);
  if (!cancel.ok) {
    return NextResponse.json({ error: cancel.message ?? '환불에 실패했습니다.' }, { status: 500 });
  }

  const newRefunded = order.refunded_amount + amount;
  const fullyRefunded = newRefunded >= order.total_amount;

  await db.from('orders').update({
    refunded_amount: newRefunded,
    status: fullyRefunded ? 'cancelled' : order.status,
  }).eq('id', orderId);

  if (fullyRefunded) {
    const { data: orderItems } = await db
      .from('order_items').select('product_id, quantity').eq('order_id', orderId);
    for (const item of orderItems ?? []) {
      await db.rpc('restore_stock', { p_product_id: item.product_id, p_qty: item.quantity });
    }
  }

  await db.from('notifications').insert({
    user_id: order.user_id,
    type: 'order',
    title: `${amount.toLocaleString('ko-KR')}원이 환불되었습니다`,
    body: fullyRefunded ? '주문이 전액 환불되어 취소되었습니다.' : '부분 환불이 처리되었습니다.',
    link: '/orders',
  });

  return NextResponse.json({ ok: true, fullyRefunded });
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: `✓ Compiled successfully`, `/api/payments/cancel` 라우트 포함.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/payments/cancel/route.ts
git commit -m "feat: 판매자 부분/전체 환불 API 라우트"
```

---

### Task 7: 대시보드 — 환불 버튼/모달

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `POST /api/payments/cancel` (Task 6).

- [ ] **Step 1: 환불 모달 상태 추가**

`updateOrderStatus` 함수 정의 바로 위(파일 내 seller 탭 렌더링 블록 시작 부분)에 상태 추가. 기존:
```ts
          const updateOrderStatus = async (orderId: string, status: string) => {
```
바로 위에 추가:
```ts
          const openRefund = (orderId: string, maxAmount: number) => {
            setRefundTarget(orderId);
            setRefundAmount(String(maxAmount));
            setRefundReason('');
          };

          const submitRefund = async () => {
            if (!refundTarget) return;
            const amount = Number(refundAmount);
            if (!amount || amount <= 0) return;
            setRefunding(true);
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/payments/cancel', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.access_token ?? ''}`,
              },
              body: JSON.stringify({ orderId: refundTarget, amount, reason: refundReason }),
            });
            const result = await res.json();
            if (res.ok) {
              setSellerOrders((prev) => prev.map((o) =>
                o.order_id === refundTarget
                  ? { ...o, refunded_amount: o.refunded_amount + amount, status: result.fullyRefunded ? 'cancelled' : o.status }
                  : o
              ));
              setRefundTarget(null);
            } else {
              setRefundError(result.error ?? '환불에 실패했습니다.');
            }
            setRefunding(false);
          };

```
그리고 `updateOrderStatus` 함수는 그대로 둔다 (변경 없음).

이 상태 변수들(`refundTarget`, `refundAmount`, `refundReason`, `refunding`, `refundError`)은 컴포넌트 최상단 다른 `useState` 선언들 옆에 추가한다. 기존:
```ts
  const [orderStatusUpdating, setOrderStatusUpdating] = useState<string | null>(null);
```
바로 아래에 추가 (이 줄이 실제로 있는지 `grep -n "orderStatusUpdating" src/app/dashboard/page.tsx`로 먼저 확인 — 없으면 seller 관련 `useState` 선언들 근처에 추가):
```ts
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding]       = useState(false);
  const [refundError, setRefundError]   = useState('');
```

- [ ] **Step 2: 주문 카드에 환불 버튼 추가**

기존:
```tsx
                        <select
                          value={order.status}
                          disabled={orderStatusUpdating === order.order_id}
                          onChange={(e) => updateOrderStatus(order.order_id, e.target.value)}
                          className="px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-700 dark:text-white/70 text-sm focus:outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
```
변경 후:
```tsx
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            disabled={orderStatusUpdating === order.order_id}
                            onChange={(e) => updateOrderStatus(order.order_id, e.target.value)}
                            className="px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-700 dark:text-white/70 text-sm focus:outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer disabled:opacity-50"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {order.total_amount - order.refunded_amount > 0 && (
                            <button
                              onClick={() => openRefund(order.order_id, order.total_amount - order.refunded_amount)}
                              className="px-3 py-2 rounded-lg border border-rose-500/25 text-rose-400/80 text-xs font-medium hover:text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/5 transition"
                            >
                              환불
                            </button>
                          )}
                        </div>
                      </div>
                      {order.refunded_amount > 0 && (
                        <p className="px-4 pb-2 text-[11px] text-rose-400/70">
                          {order.refunded_amount.toLocaleString('ko-KR')}원 환불됨
                        </p>
                      )}
```

- [ ] **Step 3: 환불 모달 추가**

`sellerOrders.map(...)` 블록이 끝나는 `)}` 바로 다음 (주문 관리 섹션 밖, "상품별 판매 현황" 섹션 시작 전) 에 추가:

```tsx
              {/* 환불 모달 */}
              {refundTarget && (() => {
                const target = sellerOrders.find((o) => o.order_id === refundTarget);
                const maxAmount = target ? target.total_amount - target.refunded_amount : 0;
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm px-4" onClick={() => setRefundTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1">환불하기</h3>
                      <p className="text-xs text-stone-400 dark:text-white/40 mb-4">환불 가능 금액: {maxAmount.toLocaleString('ko-KR')}원</p>
                      <label className="text-stone-400 dark:text-white/35 text-xs mb-1.5 block">환불 금액</label>
                      <input
                        type="number"
                        value={refundAmount}
                        max={maxAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full mb-3 px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-rose-500/50 transition"
                      />
                      <label className="text-stone-400 dark:text-white/35 text-xs mb-1.5 block">사유</label>
                      <textarea
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        rows={2}
                        placeholder="품절, 단순변심 등"
                        className="w-full mb-4 px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition resize-none"
                      />
                      {refundError && <p className="text-rose-400 text-xs mb-3">{refundError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setRefundTarget(null)} className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm text-stone-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition">
                          취소
                        </button>
                        <button
                          onClick={submitRefund}
                          disabled={refunding || !refundAmount || Number(refundAmount) > maxAmount}
                          className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition disabled:opacity-40"
                        >
                          {refunding ? '처리 중...' : '환불하기'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 5: 실제 환불로 검증**

Task 4에서 테스트 결제한 주문을 대시보드 "판매 정산" 탭에서 확인 → "환불" 버튼 클릭 → 전액 입력 후 환불 → `status`가 `cancelled`로 바뀌고 상품 재고가 원복되는지 확인 (`supabase db query`로 재고 수치 비교).

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: 판매자 대시보드에 부분/전체 환불 UI 추가"
```

---

## Self-Review

- **스펙 커버리지**: 결제창 연동(Task 3,4) ✅ / DB 컬럼·트리거(Task 1) ✅ / 재고 승인후 차감+자동취소(Task 4) ✅ / 부분환불+재고원복(Task 6,7) ✅ / 금액 위변조 방지(Task 4에서 `order.total_amount`와 비교) ✅ / 시크릿키 서버전용(Task 2,6에서 클라이언트 미노출) ✅
- **스펙 대비 조정 사항**: 스펙엔 "환불된 수량만큼 재고 원복"이라고만 되어 있었는데, 환불 UI가 상품별이 아니라 "금액" 단위라 부분환불 시 어떤 상품의 몇 개를 원복할지 알 수 없음. 그래서 **재고 원복은 전액환불(주문 취소)때만** 하도록 좁혔음 — 부분환불은 순수 금액 조정으로만 처리. 사용자에게 최종 보고 시 이 조정을 알린다.
- **범위 밖으로 남겨둔 것**: 크리에이터 커미션은 환불 시 회수하지 않음(스펙에 없었고, 되돌리기 시작하면 출금 신청과의 정합성까지 다뤄야 해서 별도 Phase감). `pending` 상태로 남고 결제를 끝내 안 한 주문(사용자가 결제창만 닫은 경우) 자동 정리도 범위 밖.
- **플레이스홀더 스캔**: 없음, 모든 스텝에 실제 코드 포함.
- **타입 일관성**: `SellerOrder`(Task 5)에 추가한 `payment_key`/`total_amount`/`refunded_amount`를 Task 7의 환불 버튼/모달이 정확히 같은 이름으로 사용. `confirmTossPayment`/`cancelTossPayment`(Task 2) 시그니처를 Task 4, 6이 동일하게 사용.
