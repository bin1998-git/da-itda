# Product Card Hover Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마켓 상품 카드에 마우스 오버 시 이미지 scale-up + 하단 슬라이드업 오버레이(장바구니/찜하기)를 추가한다.

**Architecture:** 기존 `market/page.tsx` 내부의 서버 컴포넌트 `ProductCard`를 `src/components/ui/ProductCard.tsx` Client Component로 분리한다. 호버 시 이미지가 scale(1.05)되고, 이미지 하단에서 반투명 오버레이가 슬라이드업되며 "장바구니 담기"와 찜하기 버튼을 노출한다. 버튼 클릭은 e.stopPropagation()으로 상세 페이지 이동을 막고 Supabase 쿼리를 직접 실행한다.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Supabase JS client, useAuthStore (Zustand)

## Global Constraints

- Next.js 15: `params`/`searchParams`는 Promise — 반드시 await 필요
- Tailwind CSS v4: `@custom-variant` 사용, `bg-black/3`처럼 슬래시 opacity 사용
- 다크/라이트 모드 완전 대응: 모든 색상에 `dark:` 변형 포함
- 환경변수 파일(`.env`, `application.yml`) 절대 읽거나 수정하지 말 것
- 소스 코드에 실제 API 키/비밀번호 하드코딩 금지
- Supabase Client: 클라이언트 컴포넌트는 `@/lib/supabase`의 `supabase` 사용
- 사용자 인증: `@/store/authStore`의 `useAuthStore((s) => s.user)` 사용
- Product 타입: `@/types/market`의 `Product` 인터페이스 사용
- `Link` 컴포넌트 사용 (절대 `<a>` 태그 사용 금지)
- 버튼 클릭 시 `e.stopPropagation()` + `e.preventDefault()` 호출 필수 (Link 이동 방지)

---

### Task 1: ProductCard 클라이언트 컴포넌트 생성

마켓컬리/무신사 스타일 호버 오버레이가 있는 독립 Client Component를 만든다.

**Files:**
- Create: `src/components/ui/ProductCard.tsx`

**Interfaces:**
- Consumes: `Product` from `@/types/market`, `supabase` from `@/lib/supabase`, `useAuthStore` from `@/store/authStore`, `useRouter` from `next/navigation`
- Produces: `export default function ProductCard({ product }: { product: Product })` — Task 2에서 import해 사용

- [ ] **Step 1: `src/components/ui/ProductCard.tsx` 파일 생성**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Product } from '@/types/market';

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🥩', kitchen: '🍳', snack: '🍪', drink: '🧃',
};

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR');
}

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [cartDone, setCartDone] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push('/auth/login'); return; }
    if (cartLoading || product.stock === 0) return;
    setCartLoading(true);
    const { error } = await supabase
      .from('cart_items')
      .upsert(
        { user_id: user.id, product_id: product.id, quantity: 1 },
        { onConflict: 'user_id,product_id' }
      );
    setCartLoading(false);
    if (!error) {
      setCartDone(true);
      setTimeout(() => setCartDone(false), 1500);
    }
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push('/auth/login'); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    if (liked) {
      await supabase.from('product_likes').delete()
        .eq('product_id', product.id).eq('user_id', user.id);
      setLiked(false);
    } else {
      await supabase.from('product_likes').insert({ product_id: product.id, user_id: user.id });
      setLiked(true);
    }
    setLikeLoading(false);
  };

  const isSoldOut = product.stock === 0;

  return (
    <Link href={`/market/${product.id}`} className="group block">
      <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 overflow-hidden hover:border-amber-500/30 transition-all duration-300">
        {/* 이미지 영역 */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex items-center justify-center text-6xl">
          {product.images?.[0]
            ? (
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )
            : (
              <span className="transition-transform duration-300 group-hover:scale-105 select-none">
                {CATEGORY_EMOJI[product.category] ?? '📦'}
              </span>
            )
          }

          {/* 찜하기 버튼 — 우상단, hover 시 페이드인 */}
          <button
            onClick={toggleLike}
            disabled={likeLoading}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:opacity-30"
            aria-label="찜하기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill={liked ? '#f59e0b' : 'none'} stroke={liked ? '#f59e0b' : 'white'} strokeWidth="1.5">
              <path d="M8 13.5S2 9.5 2 5.5C2 3.567 3.567 2 5.5 2c1.05 0 2 .5 2.5 1.3C8.5 2.5 9.45 2 10.5 2 12.433 2 14 3.567 14 5.5c0 4-6 8-6 8Z"/>
            </svg>
          </button>

          {/* 하단 슬라이드업 오버레이 — 터치 디바이스는 항상 표시 */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 [@media(hover:none)]:translate-y-0 transition-transform duration-300">
            <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pt-8 pb-3">
              {isSoldOut ? (
                <div className="w-full py-2.5 rounded-xl bg-white/10 text-white/40 text-sm font-semibold text-center cursor-not-allowed">
                  품절
                </div>
              ) : (
                <button
                  onClick={addToCart}
                  disabled={cartLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {cartDone ? '✓ 담겼어요' : cartLoading ? '담는 중...' : '장바구니 담기'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-400/70 tracking-wider uppercase">
              {product.sellers?.store_name ?? '판매자'}
            </span>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-[10px] text-rose-400 font-medium">잔여 {product.stock}개</span>
            )}
          </div>
          <p className="text-stone-900 dark:text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors duration-300">
            {product.title}
          </p>
          <p className="text-amber-400 font-bold text-base mt-0.5">
            {formatPrice(product.price)}원
          </p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: TypeScript 빌드 타입 체크**

```bash
cd /Users/jeongbin/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -30
```

Expected: 오류 없음 (또는 이 파일과 무관한 기존 오류만)

- [ ] **Step 3: 커밋**

```bash
cd /Users/jeongbin/Desktop/da-itda && git add src/components/ui/ProductCard.tsx && git commit -m "feat: ProductCard 클라이언트 컴포넌트 — 호버 슬라이드업 오버레이"
```

---

### Task 2: market/page.tsx에서 인라인 ProductCard 교체

`market/page.tsx` 서버 컴포넌트에서 인라인 `ProductCard` 함수와 관련 헬퍼(`CATEGORY_EMOJI`, `formatPrice`)를 제거하고 Task 1에서 만든 컴포넌트를 import한다.

**Files:**
- Modify: `src/app/market/page.tsx`

**Interfaces:**
- Consumes: `ProductCard` from `@/components/ui/ProductCard` (Task 1 산출물)

- [ ] **Step 1: `src/app/market/page.tsx` 수정**

파일 상단 import 블록에서 `Link`는 유지하고(헤더의 "상품 등록" 버튼에 사용), `ProductCard` import 추가:

```tsx
import ProductCard from '@/components/ui/ProductCard';
```

파일에서 다음 4개 항목을 삭제한다:

1. `const CATEGORY_EMOJI: Record<string, string> = { ... }` 블록 전체 (5줄)
2. `function formatPrice(price: number) { ... }` 함수 전체 (3줄)
3. `function ProductCard({ product }: { product: Product }) { ... }` 함수 전체 (28줄)
4. `import Link from 'next/link'` 줄 — **단, 아래처럼 `Link`가 JSX 내에서 아직 사용되는지 먼저 확인한다. 사용 중이면 삭제하지 말 것.**

> 확인 방법: 파일 내 `<Link` 검색. `/market/sell` 버튼과 페이지네이션 링크에서 Link를 사용한다면 import를 유지한다.

상품 그리드 섹션에서 `<ProductCard key={product.id} product={product} />` 렌더 부분은 이미 동일하게 동작하므로 변경 불필요.

- [ ] **Step 2: TypeScript 빌드 체크**

```bash
cd /Users/jeongbin/Desktop/da-itda && npx tsc --noEmit 2>&1 | head -30
```

Expected: 오류 없음

- [ ] **Step 3: dev 서버에서 시각 확인**

```bash
# 서버가 이미 실행 중인 경우 생략
lsof -i :3000 | grep LISTEN
```

브라우저에서 `http://localhost:3000/market` 접속 후:
- 상품 카드에 마우스 올렸을 때 이미지 scale-up 확인
- 하단 "장바구니 담기" 버튼 슬라이드업 확인
- 우상단 찜하기 하트 버튼 페이드인 확인
- 상품명 클릭 시 상세 페이지 이동 확인 (오버레이 버튼 클릭은 이동 안 됨)
- 다크모드 전환 시 정상 표시 확인

- [ ] **Step 4: 커밋**

```bash
cd /Users/jeongbin/Desktop/da-itda && git add src/app/market/page.tsx && git commit -m "refactor: market/page.tsx — 인라인 ProductCard를 컴포넌트로 교체"
```
