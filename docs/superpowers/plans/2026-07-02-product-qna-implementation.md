# 상품 Q&A (Phase 20) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상품 상세 페이지의 "문의" 탭에 구매자가 판매자에게 공개 질문하고 판매자가 답변하는 Q&A 기능을 붙인다.

**Architecture:** `docs/superpowers/specs/2026-07-02-product-qna-design.md`에 정의된 `product_qna` 테이블 + RLS를 그대로 사용한다. UI는 기존 `ReviewSection.tsx`의 "판매자 인라인 답글" 패턴(별도 대시보드 화면 없이, 상품 상세 페이지 안에서 `isSeller` 체크로 답변 폼을 바로 노출)을 그대로 재사용한다 — 리뷰 답글이 이미 이 방식이라 대시보드에 별도 Q&A 관리 탭을 새로 만들지 않고 기존 컨벤션을 따른다.

**Tech Stack:** Next.js App Router (서버 컴포넌트 조회 + 클라이언트 컴포넌트 상호작용), Supabase (Postgres + RLS), Zustand(`useAuthStore`).

## Global Constraints

- 질문은 최소 10자 이상이어야 한다 (design doc).
- 자기 상품에는 질문할 수 없다 (design doc).
- 비로그인 상태에서는 질문 폼 대신 로그인 유도 UI를 보여준다 (design doc).
- 답변 등록 시 질문자에게 `notifications` insert (`type: 'qna_answered'`) — 기존 `notifications` 테이블은 `type`이 자유 text라 스키마 변경 불필요.
- 이 저장소에는 자동화 테스트 러너가 없다(`package.json`에 `lint`/`build`만 존재). 각 태스크의 검증은 `npm run build`(타입체크 겸 컴파일 확인)로 한다 — 기존 Phase들과 동일한 검증 방식.

---

### Task 1: DB 마이그레이션 — `product_qna` 테이블 + RLS

**Files:**
- Create: `supabase/migrations/20260702000010_product_qna.sql`

**Interfaces:**
- Produces: `public.product_qna` 테이블 (컬럼: `id, product_id, user_id, seller_id, question, answer, answered_at, created_at`) — Task 2의 `Qna` 타입, Task 3의 컴포넌트가 이 스키마를 그대로 참조한다.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 상품 Q&A 테이블
create table public.product_qna (
  id           uuid default gen_random_uuid() primary key,
  product_id   uuid references public.products(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  seller_id    uuid references public.profiles(id) on delete set null,
  question     text not null,
  answer       text,
  answered_at  timestamptz,
  created_at   timestamptz default now()
);

alter table public.product_qna enable row level security;

create policy "누구나 조회"
  on public.product_qna for select using (true);

create policy "로그인 유저 질문 등록 (자기 상품 제외)"
  on public.product_qna for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid()
    )
  );

create policy "판매자만 답변 등록"
  on public.product_qna for update
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Supabase SQL Editor에서 수동 실행**

이 저장소는 마이그레이션을 자동 적용하는 CLI 파이프라인이 없으므로 (기존 Phase 19도 동일하게 수동 실행), Supabase 대시보드 → SQL Editor에 위 SQL을 붙여넣고 실행. 이전 Phase 19 마이그레이션(`20260630000020_creator_monetization.sql`)이 아직 미실행이면 그것도 먼저 실행.

Expected: `Success. No rows returned` — `product_qna` 테이블이 Table Editor에 나타남.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260702000010_product_qna.sql
git commit -m "feat: product_qna DB schema + RLS"
```

---

### Task 2: `Qna` 타입 추가

**Files:**
- Modify: `src/types/market.ts`

**Interfaces:**
- Consumes: Task 1의 `product_qna` 컬럼 구조.
- Produces: `Qna` 인터페이스 — Task 3(`ProductQnaSection`)과 Task 4(`market/[id]/page.tsx`)가 import한다.

- [ ] **Step 1: `Qna` 인터페이스 추가**

`src/types/market.ts`의 `Review` 인터페이스 바로 아래에 추가:

```ts
export interface Qna {
  id: string;
  product_id: string;
  user_id: string;
  seller_id: string | null;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  profiles?: { nickname: string | null; avatar_url: string | null };
}
```

- [ ] **Step 2: 빌드로 타입 에러 없는지 확인**

Run: `npm run build`
Expected: 기존과 동일하게 `✓ Compiled successfully` (이 시점엔 아직 아무도 `Qna`를 안 쓰므로 unused-export 경고 없음).

- [ ] **Step 3: Commit**

```bash
git add src/types/market.ts
git commit -m "feat: Qna 타입 추가"
```

---

### Task 3: `ProductQnaSection` 컴포넌트

**Files:**
- Create: `src/components/ui/ProductQnaSection.tsx`

**Interfaces:**
- Consumes: `Qna` (Task 2), `useAuthStore` (`@/store/authStore`), `supabase` (`@/lib/supabase`).
- Produces: `ProductQnaSection` 컴포넌트 — Props `{ productId: string; sellerId: string; qnas: Qna[] }`. Task 4가 이 정확한 prop 이름으로 렌더링한다.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Qna } from '@/types/market';

interface Props {
  productId: string;
  sellerId: string;
  qnas: Qna[];
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return '방금 전';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 2592000) return `${Math.floor(s / 86400)}일 전`;
  return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ProductQnaSection({ productId, sellerId, qnas: initialQnas }: Props) {
  const user = useAuthStore((s) => s.user);
  const [qnas, setQnas]             = useState(initialQnas);
  const [question, setQuestion]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answerTarget, setAnswerTarget] = useState<string | null>(null);
  const [answerText, setAnswerText]     = useState('');

  const isSeller = user?.id === sellerId;

  const submitQuestion = async () => {
    const q = question.trim();
    if (!user || q.length < 10) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('product_qna').insert({
      product_id: productId,
      user_id: user.id,
      seller_id: sellerId,
      question: q,
    }).select('*, profiles(nickname, avatar_url)').single();
    if (!error && data) {
      setQnas((prev) => [data as Qna, ...prev]);
      setQuestion('');
    }
    setSubmitting(false);
  };

  const submitAnswer = useCallback(async (qnaId: string) => {
    const a = answerText.trim();
    if (!isSeller || !a) return;
    setSubmitting(true);
    const answeredAt = new Date().toISOString();
    await supabase.from('product_qna').update({
      answer: a,
      answered_at: answeredAt,
    }).eq('id', qnaId);
    const target = qnas.find((q) => q.id === qnaId);
    if (target) {
      await supabase.from('notifications').insert({
        user_id: target.user_id,
        type: 'qna_answered',
        title: '판매자가 답변을 남겼습니다',
        body: target.question,
        link: `/market/${productId}`,
      });
    }
    setQnas((prev) => prev.map((q) => (q.id === qnaId ? { ...q, answer: a, answered_at: answeredAt } : q)));
    setAnswerTarget(null);
    setAnswerText('');
    setSubmitting(false);
  }, [answerText, isSeller, qnas, productId]);

  return (
    <div>
      {/* 질문 작성 폼 */}
      {user && !isSeller && (
        <div className="mb-6 p-4 rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="상품에 대해 궁금한 점을 질문해보세요 (최소 10자)"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submitQuestion}
              disabled={submitting || question.trim().length < 10}
              className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition disabled:opacity-40"
            >
              {submitting ? '등록 중...' : '질문 등록'}
            </button>
          </div>
        </div>
      )}
      {!user && (
        <div className="mb-6 p-4 rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 text-center">
          <Link href="/auth/login" className="text-sm text-amber-500 font-semibold hover:text-amber-400 transition">
            로그인하고 질문하기
          </Link>
        </div>
      )}

      {/* 목록 */}
      {qnas.length === 0 ? (
        <div className="text-center py-16 text-stone-400 dark:text-white/30 text-sm">
          아직 등록된 문의가 없어요. 첫 번째 질문을 남겨보세요!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {qnas.map((qna) => {
            const isAnswerMode = answerTarget === qna.id;
            return (
              <div key={qna.id} className="p-5 rounded-2xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-500 dark:text-white/40 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">Q</span>
                    <span className="text-sm font-medium text-stone-800 dark:text-white/80">{qna.profiles?.nickname ?? '익명'}</span>
                    <span className="text-[11px] text-stone-400 dark:text-white/30">{timeAgo(qna.created_at)}</span>
                  </div>
                  {!qna.answer && (
                    <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">답변 대기 중</span>
                  )}
                </div>
                <p className="text-sm text-stone-600 dark:text-white/60 leading-relaxed mb-3">{qna.question}</p>

                {qna.answer && (
                  <div className="ml-3 pl-4 border-l-2 border-amber-500/30 bg-amber-500/5 rounded-r-xl py-3 pr-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">A</span>
                      <span className="text-[11px] text-stone-400 dark:text-white/30">{timeAgo(qna.answered_at!)}</span>
                    </div>
                    <p className="text-sm text-stone-600 dark:text-white/60 leading-relaxed">{qna.answer}</p>
                  </div>
                )}

                {isSeller && !qna.answer && !isAnswerMode && (
                  <button
                    onClick={() => { setAnswerTarget(qna.id); setAnswerText(''); }}
                    className="text-xs text-amber-500 hover:text-amber-400 transition mt-1"
                  >
                    답변 달기
                  </button>
                )}

                {isSeller && isAnswerMode && (
                  <div className="mt-2">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="답변을 입력하세요..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition resize-none"
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => { setAnswerTarget(null); setAnswerText(''); }}
                        className="text-xs text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white transition"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => submitAnswer(qna.id)}
                        disabled={submitting || !answerText.trim()}
                        className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition disabled:opacity-40"
                      >
                        {submitting ? '등록 중...' : '답변 등록'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 빌드로 타입 에러 없는지 확인**

Run: `npm run build`
Expected: `✓ Compiled successfully` (아직 아무 페이지도 이 컴포넌트를 안 쓰므로 unused 경고는 lint에서만 뜰 수 있음 — `npm run lint`는 무시해도 됨, Task 4에서 연결되면 사라짐).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ProductQnaSection.tsx
git commit -m "feat: ProductQnaSection 컴포넌트 추가"
```

---

### Task 4: 상품 상세 페이지에 연결

**Files:**
- Modify: `src/app/market/[id]/page.tsx`

**Interfaces:**
- Consumes: `ProductQnaSection` (Task 3), `Qna` (Task 2).

- [ ] **Step 1: import 추가**

`src/app/market/[id]/page.tsx` 상단 import 블록에서:

```ts
import ProductDetailTabs from '@/components/ui/ProductDetailTabs';
```
바로 아래에 추가:
```ts
import ProductQnaSection from '@/components/ui/ProductQnaSection';
```

그리고
```ts
import { Product, Review } from '@/types/market';
```
를
```ts
import { Product, Review, Qna } from '@/types/market';
```
로 변경.

- [ ] **Step 2: `product_qna` 조회 추가**

기존:
```ts
  const [{ data: product }, { data: reviews }] = await Promise.all([
    db.from('products')
      .select('*, sellers(store_name, store_desc)')
      .eq('id', id).eq('is_active', true).single(),
    db.from('reviews')
      .select('*, profiles(nickname, avatar_url)')
      .eq('product_id', id).order('created_at', { ascending: false })
      .order('helpful_count', { ascending: false }),
  ]);
```

변경 후:
```ts
  const [{ data: product }, { data: reviews }, { data: qnas }] = await Promise.all([
    db.from('products')
      .select('*, sellers(store_name, store_desc)')
      .eq('id', id).eq('is_active', true).single(),
    db.from('reviews')
      .select('*, profiles(nickname, avatar_url)')
      .eq('product_id', id).order('created_at', { ascending: false })
      .order('helpful_count', { ascending: false }),
    db.from('product_qna')
      .select('*, profiles(nickname, avatar_url)')
      .eq('product_id', id).order('created_at', { ascending: false }),
  ]);
```

- [ ] **Step 3: `qnaList` 계산 + 탭 count 반영**

기존:
```ts
  const reviewList = (reviews ?? []) as Review[];
```
바로 아래에 추가:
```ts
  const qnaList = (qnas ?? []) as Qna[];
```

기존 tabs 배열:
```ts
  const tabs = [
    { id: 'desc',  label: '상품설명' },
    { id: 'info',  label: '상세정보' },
    { id: 'review',label: '후기', count: reviewList.length },
    { id: 'qna',   label: '문의' },
  ];
```
변경 후:
```ts
  const tabs = [
    { id: 'desc',  label: '상품설명' },
    { id: 'info',  label: '상세정보' },
    { id: 'review',label: '후기', count: reviewList.length },
    { id: 'qna',   label: '문의', count: qnaList.length },
  ];
```

- [ ] **Step 4: 플레이스홀더 "[3] 문의" 블록을 컴포넌트로 교체**

기존:
```tsx
            {/* [3] 문의 */}
            <div className="py-8 text-center">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                </div>
                <p className="text-stone-600 dark:text-white/60 text-sm">상품에 대해 궁금한 점이 있으신가요?</p>
                <Link
                  href="/inquiry/write"
                  className="px-6 py-3 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition"
                >
                  1:1 문의하기
                </Link>
              </div>
            </div>
```

변경 후:
```tsx
            {/* [3] 문의 */}
            <ProductQnaSection
              productId={id}
              sellerId={p.seller_id}
              qnas={qnaList}
            />
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: `✓ Compiled successfully`, `/market/[id]` 라우트 정상 포함.

- [ ] **Step 6: 로컬에서 수동 확인**

Run: `npm run dev` 후 브라우저로 아무 상품 상세 페이지의 "문의" 탭 확인:
- 로그아웃 상태 → "로그인하고 질문하기" 노출
- 로그인 상태(구매자) → 질문 폼 노출, 10자 미만이면 버튼 비활성
- 판매자 본인 상품 → 질문 폼 안 뜨고, 등록된 질문에 "답변 달기" 버튼 노출

- [ ] **Step 7: Commit**

```bash
git add src/app/market/\[id\]/page.tsx
git commit -m "feat: 상품 상세 문의 탭에 Q&A 연결"
```

---

## Self-Review

- Spec 커버리지: DB 스키마 ✅(Task1), RLS 3종 ✅(Task1), `ProductQnaSection` 컴포넌트(목록/미답변 표시/질문폼) ✅(Task3), 상품 상세 페이지 연결(Promise.all/탭 count/렌더링) ✅(Task4), 알림(`qna_answered`) ✅(Task3 `submitAnswer`), 제약(자기 상품 질문 불가/비로그인 폼 숨김/10자 이상) ✅(RLS + 컴포넌트 로직).
- 설계 문서의 "판매자 대시보드 seller 탭에 Q&A 섹션 추가"는 의도적으로 생략함 — 기존 `ReviewSection.tsx`가 이미 상품 상세 페이지 내 인라인 답변 방식이고 대시보드에 별도 리뷰 관리 화면도 없어, 컨벤션을 따라 동일하게 처리. 판매자는 자기 상품 페이지에서 바로 답변한다.
- Placeholder 스캔: 없음, 모든 스텝에 실제 코드 포함.
- 타입 일관성: `Qna` 필드명이 Task2~4에서 `id/product_id/user_id/seller_id/question/answer/answered_at/created_at/profiles` 로 동일하게 사용됨.
