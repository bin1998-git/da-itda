# 크리에이터 수익화 시스템 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 레시피 영상에 마켓 상품을 태그하고 영상을 통한 구매 발생 시 크리에이터에게 5% 캐시를 자동 지급하는 시스템 구축

**Architecture:** Supabase DB 트리거로 커미션 자동 적립, localStorage로 referral 추적, Next.js App Router 서버/클라이언트 컴포넌트 혼합 사용

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS

## Global Constraints

- Supabase 클라이언트: `import { supabase } from '@/lib/supabase'` (클라이언트 컴포넌트)
- Supabase 서버: `import { supabaseServer } from '@/lib/supabaseServer'` (서버 컴포넌트)
- 인증 상태: `useAuthStore((s) => s.user)` from `@/store/authStore`
- 배경: `bg-[#EDE8E2] dark:bg-[#0a0a0a]`
- 카드: `bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10`
- 포인트 컬러: `amber-500`
- 댓글/비동기 fire-and-forget: `.then(() => {})`
- 커미션율 상수: `CREATOR_COMMISSION_RATE = 0.05` (5%)
- 최소 출금액: 5000원
- 상품 태그 최대: 5개
- `'use client'` 지시어는 클라이언트 컴포넌트 최상단에 반드시 추가

---

## Task 1: DB 마이그레이션 — 테이블, 컬럼, 트리거

**Files:**
- Create: `supabase/migrations/20260630000020_creator_monetization.sql`

**Interfaces:**
- Produces: `media_product_tags`, `creator_earnings`, `cash_withdrawals` 테이블, `orders.referral_media_id`, `profiles.creator_cash` 컬럼, `trigger_creator_commission` 트리거

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/20260630000020_creator_monetization.sql

-- 1. 영상-상품 태그 연결 테이블
create table public.media_product_tags (
  id uuid default gen_random_uuid() primary key,
  media_post_id uuid references public.media_posts(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(media_post_id, product_id)
);
alter table public.media_product_tags enable row level security;
create policy "누구나 태그 조회" on public.media_product_tags for select using (true);
create policy "미디어 작성자만 태그 관리" on public.media_product_tags
  for all using (
    exists (
      select 1 from public.media_posts
      where id = media_post_id and user_id = auth.uid()
    )
  );

-- 2. 크리에이터 수익 내역 테이블
create table public.creator_earnings (
  id uuid default gen_random_uuid() primary key,
  creator_user_id uuid references public.profiles(id) on delete cascade not null,
  media_post_id uuid references public.media_posts(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  amount integer not null,
  created_at timestamptz default now()
);
alter table public.creator_earnings enable row level security;
create policy "본인 수익만 조회" on public.creator_earnings
  for select using (auth.uid() = creator_user_id);

-- 3. 출금 신청 테이블
create table public.cash_withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  status text not null default 'pending',
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  created_at timestamptz default now(),
  processed_at timestamptz,
  constraint cash_withdrawals_status_check check (status in ('pending','approved','rejected')),
  constraint cash_withdrawals_amount_check check (amount >= 5000)
);
alter table public.cash_withdrawals enable row level security;
create policy "본인 출금 조회" on public.cash_withdrawals
  for select using (auth.uid() = user_id);
create policy "본인 출금 신청" on public.cash_withdrawals
  for insert with check (auth.uid() = user_id);

-- 4. orders 테이블에 referral 컬럼 추가
alter table public.orders
  add column if not exists referral_media_id uuid references public.media_posts(id) on delete set null;

-- 5. profiles 테이블에 creator_cash 컬럼 추가
alter table public.profiles
  add column if not exists creator_cash integer not null default 0;

-- 6. 커미션 자동 적립 트리거 함수
create or replace function public.credit_creator_commission()
returns trigger language plpgsql security definer as $$
declare
  v_creator_id uuid;
  v_commission  integer;
begin
  if new.referral_media_id is null then
    return new;
  end if;

  select user_id into v_creator_id
  from public.media_posts
  where id = new.referral_media_id;

  -- 자기 자신 레퍼럴 제외
  if v_creator_id is null or v_creator_id = new.user_id then
    return new;
  end if;

  v_commission := floor(new.total_amount * 0.05);

  if v_commission > 0 then
    insert into public.creator_earnings
      (creator_user_id, media_post_id, order_id, amount)
    values
      (v_creator_id, new.referral_media_id, new.id, v_commission);

    update public.profiles
    set creator_cash = creator_cash + v_commission
    where id = v_creator_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_creator_commission on public.orders;
create trigger trigger_creator_commission
  after insert on public.orders
  for each row execute function public.credit_creator_commission();
```

- [ ] **Step 2: Supabase SQL Editor에서 실행**

  Supabase 대시보드 → SQL Editor → 위 SQL 전체 붙여넣기 → Run

  기대 결과: "Success. No rows returned"

- [ ] **Step 3: 테이블 생성 확인**

  SQL Editor에서 실행:
  ```sql
  select table_name from information_schema.tables
  where table_schema = 'public'
    and table_name in ('media_product_tags','creator_earnings','cash_withdrawals');
  ```
  기대 결과: 3행 반환

- [ ] **Step 4: 트리거 등록 확인**

  ```sql
  select trigger_name, event_manipulation, action_timing
  from information_schema.triggers
  where trigger_name = 'trigger_creator_commission';
  ```
  기대 결과: `trigger_creator_commission | INSERT | AFTER`

- [ ] **Step 5: 커밋**

  ```bash
  git add supabase/migrations/20260630000020_creator_monetization.sql
  git commit -m "feat: creator monetization DB schema & trigger"
  ```

---

## Task 2: ProductTagSelector 컴포넌트

**Files:**
- Create: `src/components/ui/ProductTagSelector.tsx`

**Interfaces:**
- Produces: `<ProductTagSelector selectedIds={string[]} onChange={(ids: string[]) => void} />`

- [ ] **Step 1: 컴포넌트 생성**

```tsx
// src/components/ui/ProductTagSelector.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function ProductTagSelector({ selectedIds, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title, price, images')
        .ilike('title', `%${query}%`)
        .eq('is_active', true)
        .limit(8);
      setResults((data ?? []) as Product[]);
      setOpen(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const add = (p: Product) => {
    if (selectedIds.includes(p.id) || selectedIds.length >= 5) return;
    const next = [...selected, p];
    setSelected(next);
    onChange(next.map((x) => x.id));
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const remove = (id: string) => {
    const next = selected.filter((p) => p.id !== id);
    setSelected(next);
    onChange(next.map((x) => x.id));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 선택된 상품 칩 */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/20"
            >
              {p.title}
              <button type="button" onClick={() => remove(p.id)} className="hover:text-amber-800 dark:hover:text-amber-200">×</button>
            </span>
          ))}
        </div>
      )}

      {/* 검색 인풋 */}
      {selectedIds.length < 5 && (
        <div ref={ref} className="relative">
          <input
            type="text"
            placeholder="상품 이름으로 검색 (최대 5개)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
          />
          {open && results.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => add(p)}
                    disabled={selectedIds.includes(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-500/5 transition disabled:opacity-40 text-left"
                  >
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 shrink-0" />
                    )}
                    <span className="text-sm text-stone-800 dark:text-white flex-1 truncate">{p.title}</span>
                    <span className="text-xs text-amber-500 shrink-0">{p.price.toLocaleString('ko-KR')}원</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 확인**

  ```bash
  cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | grep -i "ProductTagSelector\|error" | head -10
  ```
  기대 결과: 에러 없음

- [ ] **Step 3: 커밋**

  ```bash
  git add src/components/ui/ProductTagSelector.tsx
  git commit -m "feat: ProductTagSelector 컴포넌트 추가"
  ```

---

## Task 3: 영상 업로드 페이지 — 상품 태그 추가

**Files:**
- Modify: `src/app/media/upload/page.tsx`

**Interfaces:**
- Consumes: `<ProductTagSelector selectedIds onChange />` from Task 2
- Produces: 업로드 후 `media_product_tags` rows

- [ ] **Step 1: ProductTagSelector import 및 state 추가**

  `src/app/media/upload/page.tsx` 상단에 import 추가:
  ```tsx
  import ProductTagSelector from '@/components/ui/ProductTagSelector';
  ```

  `useState` 블록에 추가:
  ```tsx
  const [productTagIds, setProductTagIds] = useState<string[]>([]);
  ```

- [ ] **Step 2: handleSubmit에서 태그 저장 로직 추가**

  기존 코드:
  ```tsx
  const { error: err } = await supabase.from('media_posts').insert({
    user_id: user.id,
    title: form.title,
    description: form.description || null,
    video_url: form.video_url,
    thumbnail_url: form.thumbnail_url || null,
    tags: form.tags,
  });

  setLoading(false);
  if (err) {
    setError(err.message);
    return;
  }
  router.push('/media');
  ```

  변경 후:
  ```tsx
  const { data: newPost, error: err } = await supabase.from('media_posts').insert({
    user_id: user.id,
    title: form.title,
    description: form.description || null,
    video_url: form.video_url,
    thumbnail_url: form.thumbnail_url || null,
    tags: form.tags,
  }).select('id').single();

  setLoading(false);
  if (err || !newPost) {
    setError(err?.message ?? '업로드 실패');
    return;
  }

  if (productTagIds.length > 0) {
    await supabase.from('media_product_tags').insert(
      productTagIds.map((pid) => ({ media_post_id: newPost.id, product_id: pid }))
    );
  }

  router.push('/media');
  ```

- [ ] **Step 3: 폼 UI에 ProductTagSelector 추가**

  기존 태그 섹션(`{/* 태그 */}`) 바로 아래에 추가:
  ```tsx
  {/* 상품 태그 */}
  <div>
    <label className="text-stone-500 dark:text-white/50 text-xs font-semibold tracking-wider uppercase block mb-2">
      재료 상품 태그 <span className="text-stone-400 dark:text-white/30 normal-case font-normal">(선택, 최대 5개)</span>
    </label>
    <p className="text-xs text-stone-400 dark:text-white/40 mb-3">
      이 레시피에 사용된 재료를 마켓에서 검색해 태그하면, 시청자가 바로 구매할 수 있어요.
    </p>
    <ProductTagSelector selectedIds={productTagIds} onChange={setProductTagIds} />
  </div>
  ```

- [ ] **Step 4: TypeScript 확인**

  ```bash
  cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | grep "error" | head -10
  ```
  기대 결과: 에러 없음

- [ ] **Step 5: 커밋**

  ```bash
  git add src/app/media/upload/page.tsx
  git commit -m "feat: 영상 업로드 시 상품 태그 기능 추가"
  ```

---

## Task 4: MediaProductSection 컴포넌트

**Files:**
- Create: `src/components/ui/MediaProductSection.tsx`

**Interfaces:**
- Produces: `<MediaProductSection products={TaggedProduct[]} mediaPostId={string} />`

- [ ] **Step 1: 컴포넌트 생성**

```tsx
// src/components/ui/MediaProductSection.tsx
'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export interface TaggedProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
}

interface Props {
  products: TaggedProduct[];
  mediaPostId: string;
}

export default function MediaProductSection({ products, mediaPostId }: Props) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  if (products.length === 0) return null;

  const addToCart = async (productId: string) => {
    if (!user) { router.push('/auth/login'); return; }

    await supabase.from('cart_items').upsert(
      { user_id: user.id, product_id: productId, quantity: 1 },
      { onConflict: 'user_id,product_id', ignoreDuplicates: false }
    );

    localStorage.setItem('referral_media_id', mediaPostId);
    router.push('/cart');
  };

  return (
    <section className="mt-8 pt-8 border-t border-black/5 dark:border-white/5">
      <h2 className="text-base font-bold text-stone-800 dark:text-white mb-4">
        🛒 이 레시피 재료 구매하기
      </h2>
      <div className="flex flex-col gap-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8"
          >
            {p.images?.[0] ? (
              <img src={p.images[0]} alt={p.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 shrink-0 flex items-center justify-center text-xl">📦</div>
            )}
            <div className="flex-1 min-w-0">
              <Link href={`/market/${p.id}`} className="text-sm font-medium text-stone-800 dark:text-white hover:text-amber-500 transition line-clamp-1">
                {p.title}
              </Link>
              <p className="text-sm text-amber-500 font-semibold mt-0.5">{p.price.toLocaleString('ko-KR')}원</p>
            </div>
            <button
              onClick={() => addToCart(p.id)}
              className="shrink-0 px-4 py-2 rounded-full bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition"
            >
              담기
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: TypeScript 확인**

  ```bash
  cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | grep "error" | head -10
  ```
  기대 결과: 에러 없음

- [ ] **Step 3: 커밋**

  ```bash
  git add src/components/ui/MediaProductSection.tsx
  git commit -m "feat: MediaProductSection 컴포넌트 추가"
  ```

---

## Task 5: 영상 상세 페이지 — 상품 섹션 통합

**Files:**
- Modify: `src/app/media/[id]/page.tsx`
- Modify: `src/types/media.ts`

**Interfaces:**
- Consumes: `<MediaProductSection>` from Task 4, `TaggedProduct` type
- Produces: 영상 상세페이지에 재료 상품 섹션 렌더링

- [ ] **Step 1: media 타입 업데이트**

  `src/types/media.ts`:
  ```ts
  import { TaggedProduct } from '@/components/ui/MediaProductSection';

  export interface MediaPost {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    video_url: string;
    thumbnail_url: string | null;
    tags: string[];
    views: number;
    created_at: string;
    profiles?: { username: string | null };
    like_count?: number;
    tagged_products?: TaggedProduct[];
  }
  ```

- [ ] **Step 2: 서버 컴포넌트에서 태그 상품 조회 추가**

  `src/app/media/[id]/page.tsx`에서 import 추가:
  ```tsx
  import MediaProductSection, { TaggedProduct } from '@/components/ui/MediaProductSection';
  ```

  기존 `Promise.all` 블록 수정:
  ```tsx
  const [{ data: post }, { count: likeCount }, { data: taggedRows }] = await Promise.all([
    db.from('media_posts').select('*').eq('id', id).single(),
    db.from('media_likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
    db.from('media_product_tags')
      .select('products(id, title, price, images)')
      .eq('media_post_id', id),
  ]);
  ```

  `const p = post as MediaPost;` 아래에 추가:
  ```tsx
  const taggedProducts = (taggedRows ?? [])
    .map((r) => (r as unknown as { products: TaggedProduct }).products)
    .filter(Boolean);
  ```

- [ ] **Step 3: JSX에 MediaProductSection 추가**

  `{/* 설명 */}` 섹션 바로 아래, `{/* 다른 영상 추천 */}` 위에 추가:
  ```tsx
  <MediaProductSection products={taggedProducts} mediaPostId={p.id} />
  ```

- [ ] **Step 4: TypeScript 확인**

  ```bash
  cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | grep "error" | head -10
  ```
  기대 결과: 에러 없음

- [ ] **Step 5: 커밋**

  ```bash
  git add src/app/media/[id]/page.tsx src/types/media.ts
  git commit -m "feat: 영상 상세 페이지에 재료 상품 섹션 추가"
  ```

---

## Task 6: 장바구니 결제 — referral 추적

**Files:**
- Modify: `src/app/cart/page.tsx` (약 233번째 줄 orders INSERT 블록)

**Interfaces:**
- Consumes: `localStorage.getItem('referral_media_id')` — Task 4에서 설정됨
- Produces: `orders.referral_media_id` 컬럼에 값 저장 → 트리거 발동

- [ ] **Step 1: handlePurchase에 referral 읽기 추가**

  `handlePurchase` 함수 내 `// 주문 생성` 주석 바로 위에 추가:
  ```tsx
  const referralMediaId = localStorage.getItem('referral_media_id') ?? null;
  ```

- [ ] **Step 2: orders INSERT payload에 referral_media_id 추가**

  기존:
  ```tsx
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
    })
    .select('id')
    .single();
  ```

  변경 후:
  ```tsx
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
  ```

- [ ] **Step 3: 주문 완료 후 localStorage 정리**

  `await supabase.from('cart_items').delete().eq('user_id', user.id);` 바로 뒤에 추가:
  ```tsx
  localStorage.removeItem('referral_media_id');
  ```

- [ ] **Step 4: TypeScript 확인**

  ```bash
  cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | grep "error" | head -10
  ```
  기대 결과: 에러 없음

- [ ] **Step 5: 커밋**

  ```bash
  git add src/app/cart/page.tsx
  git commit -m "feat: 결제 시 referral_media_id 추적 추가"
  ```

---

## Task 7: 크리에이터 대시보드 페이지

**Files:**
- Create: `src/app/creator/page.tsx`

**Interfaces:**
- Consumes: `profiles.creator_cash`, `creator_earnings`, `cash_withdrawals` from Task 1 DB
- Produces: `/creator` 라우트 — 수익 현황 + 출금 신청

- [ ] **Step 1: 크리에이터 페이지 생성**

```tsx
// src/app/creator/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const MIN_WITHDRAWAL = 5000;

interface Earning {
  id: string;
  media_post_id: string | null;
  order_id: string | null;
  amount: number;
  created_at: string;
  media_posts?: { title: string } | null;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bank_name: string;
  account_number: string;
  account_holder: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '검토 중',
  approved: '승인됨',
  rejected: '반려됨',
};

export default function CreatorPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  const [cash, setCash] = useState(0);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [fetching, setFetching] = useState(true);

  const [form, setForm] = useState({ bank_name: '', account_number: '', account_holder: '', amount: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/auth/login'); return; }

    Promise.all([
      supabase.from('profiles').select('creator_cash').eq('id', user.id).single(),
      supabase.from('creator_earnings')
        .select('id, media_post_id, order_id, amount, created_at, media_posts(title)')
        .eq('creator_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('cash_withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]).then(([profileRes, earningsRes, withdrawalsRes]) => {
      setCash((profileRes.data as { creator_cash: number } | null)?.creator_cash ?? 0);
      setEarnings((earningsRes.data ?? []) as unknown as Earning[]);
      setWithdrawals((withdrawalsRes.data ?? []) as Withdrawal[]);
      setFetching(false);
    });
  }, [user, isLoading, router]);

  const thisMonthEarnings = earnings
    .filter((e) => new Date(e.created_at).getMonth() === new Date().getMonth())
    .reduce((s, e) => s + e.amount, 0);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amt = parseInt(form.amount, 10);
    if (!form.bank_name || !form.account_number || !form.account_holder) {
      setFormError('모든 항목을 입력해주세요.');
      return;
    }
    if (isNaN(amt) || amt < MIN_WITHDRAWAL) {
      setFormError(`최소 출금액은 ${MIN_WITHDRAWAL.toLocaleString('ko-KR')}원입니다.`);
      return;
    }
    if (amt > cash) {
      setFormError('보유 캐시보다 많은 금액은 출금할 수 없습니다.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('cash_withdrawals').insert({
      user_id: user!.id,
      amount: amt,
      bank_name: form.bank_name,
      account_number: form.account_number,
      account_holder: form.account_holder,
    });
    setSubmitting(false);
    if (error) { setFormError(error.message); return; }
    setFormSuccess(true);
    setForm({ bank_name: '', account_number: '', account_holder: '', amount: '' });
    const { data } = await supabase.from('cash_withdrawals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10);
    setWithdrawals((data ?? []) as Withdrawal[]);
  };

  if (isLoading || fetching) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">크리에이터 수익</h1>

        {/* 수익 요약 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-amber-500 text-black">
            <p className="text-xs font-semibold opacity-70 mb-1">보유 캐시</p>
            <p className="text-2xl font-bold">{cash.toLocaleString('ko-KR')}원</p>
          </div>
          <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
            <p className="text-xs font-semibold text-stone-500 dark:text-white/50 mb-1">이번 달 수익</p>
            <p className="text-2xl font-bold text-stone-900 dark:text-white">{thisMonthEarnings.toLocaleString('ko-KR')}원</p>
          </div>
        </div>

        {/* 수익 내역 */}
        <section>
          <h2 className="text-sm font-bold text-stone-500 dark:text-white/50 uppercase tracking-wider mb-3">수익 내역</h2>
          {earnings.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-white/40">아직 수익이 없습니다. 영상에 상품을 태그해보세요!</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {earnings.map((e) => (
                <li key={e.id} className="flex items-center justify-between p-4 rounded-xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-white">
                      {(e.media_posts as { title: string } | null)?.title ?? '삭제된 영상'}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-white/40 mt-0.5">
                      {new Date(e.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-amber-500">+{e.amount.toLocaleString('ko-KR')}원</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 출금 신청 */}
        <section>
          <h2 className="text-sm font-bold text-stone-500 dark:text-white/50 uppercase tracking-wider mb-3">출금 신청</h2>
          {formSuccess && (
            <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
              출금 신청이 완료됐습니다. 영업일 기준 3~5일 내 처리됩니다.
            </div>
          )}
          <form onSubmit={handleWithdraw} className="flex flex-col gap-3">
            <input
              placeholder="은행명 (예: 카카오뱅크)"
              value={form.bank_name}
              onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
            />
            <input
              placeholder="계좌번호"
              value={form.account_number}
              onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
            />
            <input
              placeholder="예금주"
              value={form.account_holder}
              onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
            />
            <input
              type="number"
              placeholder={`출금 금액 (최소 ${MIN_WITHDRAWAL.toLocaleString('ko-KR')}원)`}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition text-sm"
            />
            {formError && <p className="text-rose-400 text-sm">{formError}</p>}
            <button
              type="submit"
              disabled={submitting || cash < MIN_WITHDRAWAL}
              className="py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition disabled:opacity-50 text-sm"
            >
              {submitting ? '신청 중...' : '출금 신청'}
            </button>
            {cash < MIN_WITHDRAWAL && (
              <p className="text-xs text-stone-400 dark:text-white/40 text-center">
                보유 캐시가 최소 출금액({MIN_WITHDRAWAL.toLocaleString('ko-KR')}원) 미만입니다.
              </p>
            )}
          </form>
        </section>

        {/* 출금 신청 내역 */}
        {withdrawals.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-stone-500 dark:text-white/50 uppercase tracking-wider mb-3">출금 내역</h2>
            <ul className="flex flex-col gap-2">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex items-center justify-between p-4 rounded-xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-white">{w.bank_name} {w.account_number}</p>
                    <p className="text-xs text-stone-400 dark:text-white/40 mt-0.5">{new Date(w.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-stone-800 dark:text-white">{w.amount.toLocaleString('ko-KR')}원</p>
                    <p className={`text-xs mt-0.5 ${w.status === 'approved' ? 'text-green-500' : w.status === 'rejected' ? 'text-rose-400' : 'text-amber-500'}`}>
                      {STATUS_LABEL[w.status]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: TypeScript 확인**

  ```bash
  cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | grep "error" | head -10
  ```
  기대 결과: 에러 없음

- [ ] **Step 3: 커밋**

  ```bash
  git add src/app/creator/page.tsx
  git commit -m "feat: 크리에이터 대시보드 페이지 추가"
  ```

---

## Task 8: Navbar에 크리에이터 링크 추가 + 최종 푸시

**Files:**
- Modify: `src/components/layout/Navbar.tsx` (또는 유사한 네비게이션 파일)

**Interfaces:**
- Consumes: 없음
- Produces: 로그인 유저에게 `/creator` 링크 노출

- [ ] **Step 1: Navbar 파일 확인**

  ```bash
  find ~/Desktop/da-itda/src -name "*.tsx" | xargs grep -l "creator\|/profile\|/orders" | head -5
  ```

- [ ] **Step 2: 유저 드롭다운에 크리에이터 링크 추가**

  프로필/마이페이지 드롭다운 메뉴에서 기존 `/orders` 링크 근처에 추가:
  ```tsx
  <Link href="/creator" className="...기존 메뉴 아이템 스타일...">
    크리에이터 수익
  </Link>
  ```

- [ ] **Step 3: 빌드 확인**

  ```bash
  cd ~/Desktop/da-itda && npm run build 2>&1 | tail -20
  ```
  기대 결과: `✓ Compiled successfully` 또는 Route 목록에 `/creator` 포함

- [ ] **Step 4: 최종 커밋 + 푸시**

  ```bash
  git add -p  # 변경된 Navbar 파일만 스테이징
  git commit -m "feat: Phase 19 크리에이터 수익화 — 영상 상품 태그 + 커미션 적립 + 출금 신청"
  git push origin main
  ```

---

## 검증 체크리스트

- [ ] DB: `media_product_tags`, `creator_earnings`, `cash_withdrawals` 테이블 존재
- [ ] DB: `orders.referral_media_id` 컬럼 존재
- [ ] DB: `profiles.creator_cash` 컬럼 존재 (기본값 0)
- [ ] DB: `trigger_creator_commission` 트리거 INSERT/AFTER 등록
- [ ] UI: `/media/upload` 페이지에 상품 태그 섹션 표시
- [ ] UI: `/media/[id]` 페이지에 태그된 상품 있으면 "이 레시피 재료" 섹션 표시
- [ ] UI: "담기" 클릭 시 장바구니 이동 + localStorage에 referral_media_id 저장
- [ ] UI: 결제 완료 시 orders.referral_media_id 저장됨
- [ ] UI: `/creator` 페이지에 캐시 잔액, 수익 내역, 출금 폼 표시
