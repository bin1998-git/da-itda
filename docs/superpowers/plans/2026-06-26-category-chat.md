# 커뮤니티 카테고리 재설계 + 채팅 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 커뮤니티 카테고리를 7개+서브카테고리로 확장하고, Supabase Realtime 기반 오픈 채팅방(고정 7개+유저 생성) + 1:1 DM 시스템을 구현한다.

**Architecture:** Supabase Realtime postgres_changes 구독으로 실시간 메시지 전달. 카테고리는 `src/types/community.ts` 단일 소스로 관리해 목록/글쓰기/상세 페이지가 동일 상수를 참조. 채팅 허브(`/chat`)는 서버 컴포넌트로 초기 방 목록을 SSR하고, 실제 채팅창은 Client Component에서 구독 처리.

**Tech Stack:** Next.js 15 App Router · Supabase JS v2 · Supabase Realtime · Tailwind CSS v4 · TypeScript · Zustand (authStore)

## Global Constraints

- 모든 env 변수 하드코딩 금지 — `process.env.NEXT_PUBLIC_*` 형태만 허용
- 기존 `posts` 테이블 데이터 호환 유지 (category 값 변경 없음, subcategory는 nullable)
- Tailwind: `dark:` prefix 다크모드 클래스 필수 적용, 라이트 배경색 `#EDE8E2` / 다크 `#0a0a0a`
- 검증: 각 태스크 완료 후 `npx tsc --noEmit` → 에러 0개 확인
- 커밋: 각 태스크마다 독립 커밋

---

## 파일 맵

**신규 생성:**
- `supabase/migrations/20260626000060_posts_subcategory.sql`
- `supabase/migrations/20260626000070_chat_schema.sql`
- `supabase/migrations/20260626000080_chat_seed.sql`
- `src/types/community.ts`
- `src/components/ui/CommunityCategoryFilter.tsx`
- `src/components/ui/DmButton.tsx`
- `src/components/ui/ChatUnreadBadge.tsx`
- `src/components/ui/ChatRoomClient.tsx`
- `src/app/chat/page.tsx`
- `src/app/chat/room/[roomId]/page.tsx`
- `src/app/chat/dm/[userId]/page.tsx`

**수정:**
- `src/app/community/page.tsx` — 카테고리/서브 필터 파라미터 추가
- `src/app/community/write/page.tsx` — 7개 카테고리 + 서브카테고리 드롭다운
- `src/app/community/[id]/page.tsx` — 서브카테고리 뱃지 + DmButton
- `src/components/ui/Navbar.tsx` — 채팅 아이콘 + ChatUnreadBadge

---

## Task 1: DB 마이그레이션 3개

**Files:**
- Create: `supabase/migrations/20260626000060_posts_subcategory.sql`
- Create: `supabase/migrations/20260626000070_chat_schema.sql`
- Create: `supabase/migrations/20260626000080_chat_seed.sql`

- [ ] **Step 1: posts 서브카테고리 마이그레이션 작성**

`supabase/migrations/20260626000060_posts_subcategory.sql`:
```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS subcategory TEXT;
```

- [ ] **Step 2: 채팅 스키마 마이그레이션 작성**

`supabase/migrations/20260626000070_chat_schema.sql`:
```sql
-- 오픈 채팅방
CREATE TABLE chat_rooms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL CHECK (type IN ('fixed', 'user')),
  category    TEXT,
  creator_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_rooms_select" ON chat_rooms FOR SELECT USING (true);
CREATE POLICY "chat_rooms_insert" ON chat_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND type = 'user');

-- 오픈 채팅방 메시지
CREATE TABLE chat_room_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_room_messages_select" ON chat_room_messages FOR SELECT USING (true);
CREATE POLICY "chat_room_messages_insert" ON chat_room_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "chat_room_messages_delete" ON chat_room_messages FOR DELETE
  USING (auth.uid() = sender_id);
CREATE INDEX chat_room_messages_room_idx ON chat_room_messages(room_id, created_at);

-- 1:1 DM 대화 (user1_id < user2_id 강제로 중복 방지)
CREATE TABLE direct_conversations (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT direct_conversations_ordered CHECK (user1_id < user2_id),
  UNIQUE (user1_id, user2_id)
);
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "direct_conversations_select" ON direct_conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "direct_conversations_insert" ON direct_conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- DM 메시지
CREATE TABLE direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "direct_messages_select" ON direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM direct_conversations dc
      WHERE dc.id = direct_messages.conversation_id
        AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
    )
  );
CREATE POLICY "direct_messages_insert" ON direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE INDEX direct_messages_conv_idx ON direct_messages(conversation_id, created_at);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- DM 대화 생성 RPC (LEAST/GREATEST로 순서 보장)
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  u1 UUID := LEAST(auth.uid()::text, other_user::text)::UUID;
  u2 UUID := GREATEST(auth.uid()::text, other_user::text)::UUID;
BEGIN
  SELECT id INTO conv_id FROM direct_conversations
  WHERE user1_id = u1 AND user2_id = u2;
  IF conv_id IS NULL THEN
    INSERT INTO direct_conversations (user1_id, user2_id)
    VALUES (u1, u2) RETURNING id INTO conv_id;
  END IF;
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 3: 고정 채팅방 시드 마이그레이션 작성**

`supabase/migrations/20260626000080_chat_seed.sql`:
```sql
INSERT INTO chat_rooms (name, description, type, category) VALUES
  ('🍳 레시피방',    '레시피를 공유하고 요리 이야기를 나눠요', 'fixed', 'recipe'),
  ('🥦 재료·식품방', '좋은 식재료, 식품 정보 공유',           'fixed', 'ingredient'),
  ('🔪 주방용품방',  '주방용품 추천 및 사용 후기',             'fixed', 'kitchenware'),
  ('🗺️ 맛집방',     '맛집 정보를 공유해요',                   'fixed', 'restaurant'),
  ('💡 꿀팁방',     '요리·식재료 꿀팁 공유',                  'fixed', 'tip'),
  ('❓ 질문방',     '요리 궁금증을 해결해요',                  'fixed', 'question'),
  ('💬 자유방',     '자유롭게 이야기해요',                     'fixed', 'general');
```

- [ ] **Step 4: Supabase에 마이그레이션 적용**

```bash
cd ~/Desktop/da-itda
npx supabase db push
```
Expected: `Applying migration 20260626000060...`, `...000070...`, `...000080...` 순서대로 성공

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/
git commit -m "feat: DB — posts subcategory, chat 4테이블, 고정방 시드"
```

---

## Task 2: 커뮤니티 타입 상수 파일

**Files:**
- Create: `src/types/community.ts`

**Produces:**
- `COMMUNITY_CATEGORIES: CommunityCategory[]`
- `COMMUNITY_CATEGORY_MAP: Record<string, CommunityCategory>`
- `type PostCategory`

- [ ] **Step 1: 타입 파일 생성**

`src/types/community.ts`:
```ts
export type PostCategory =
  | 'recipe' | 'ingredient' | 'kitchenware'
  | 'restaurant' | 'tip' | 'question' | 'general';

export interface CommunityCategory {
  value: PostCategory;
  label: string;
  color: string;       // Tailwind class string
  emoji: string;
  subcategories?: string[];
}

export const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  {
    value: 'recipe',
    label: '레시피',
    color: 'text-amber-500 bg-amber-500/10',
    emoji: '🍳',
    subcategories: ['한식', '양식', '일식', '중식', '디저트·베이킹'],
  },
  {
    value: 'ingredient',
    label: '재료·식품',
    color: 'text-green-500 bg-green-500/10',
    emoji: '🥦',
    subcategories: ['채소·과일', '육류·해산물', '유제품', '가공식품', '조미료'],
  },
  {
    value: 'kitchenware',
    label: '주방용품',
    color: 'text-indigo-500 bg-indigo-500/10',
    emoji: '🔪',
    subcategories: ['조리도구', '냄비·팬', '식기', '보관용품', '소형가전'],
  },
  {
    value: 'restaurant',
    label: '맛집',
    color: 'text-rose-500 bg-rose-500/10',
    emoji: '🗺️',
    subcategories: ['서울', '경기·인천', '지방', '해외'],
  },
  {
    value: 'tip',
    label: '꿀팁',
    color: 'text-yellow-500 bg-yellow-500/10',
    emoji: '💡',
    subcategories: ['보관법', '손질법', '절약팁', '플레이팅'],
  },
  {
    value: 'question',
    label: '질문',
    color: 'text-sky-500 bg-sky-500/10',
    emoji: '❓',
  },
  {
    value: 'general',
    label: '자유',
    color: 'text-stone-500 bg-stone-500/10',
    emoji: '💬',
  },
];

export const COMMUNITY_CATEGORY_MAP: Record<string, CommunityCategory> =
  Object.fromEntries(COMMUNITY_CATEGORIES.map((c) => [c.value, c]));
```

- [ ] **Step 2: 타입 체크**

```bash
cd ~/Desktop/da-itda && npx tsc --noEmit 2>&1 | tail -5
```
Expected: 출력 없음 (에러 0개)

- [ ] **Step 3: 커밋**

```bash
git add src/types/community.ts
git commit -m "feat: 커뮤니티 카테고리 타입 상수 (7개 + 서브카테고리)"
```

---

## Task 3: CommunityCategoryFilter 컴포넌트 + 커뮤니티 목록 페이지 업데이트

**Files:**
- Create: `src/components/ui/CommunityCategoryFilter.tsx`
- Modify: `src/app/community/page.tsx`

**Consumes:** `COMMUNITY_CATEGORIES`, `COMMUNITY_CATEGORY_MAP` from `@/types/community`

- [ ] **Step 1: CommunityCategoryFilter 컴포넌트 생성**

`src/components/ui/CommunityCategoryFilter.tsx`:
```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { COMMUNITY_CATEGORIES } from '@/types/community';

function FilterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') ?? '';
  const currentSub = searchParams.get('sub') ?? '';

  const activeCat = COMMUNITY_CATEGORIES.find((c) => c.value === currentCategory);

  const navigate = (category: string, sub?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (sub) params.set('sub', sub);
    const qs = params.toString();
    router.push(`/community${qs ? `?${qs}` : ''}`);
  };

  const tabBase =
    'px-4 py-1.5 rounded-full text-sm font-medium transition border';
  const tabActive =
    'bg-emerald-500 border-emerald-500 text-black';
  const tabInactive =
    'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-stone-600 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-white';
  const subBase =
    'px-3 py-1 rounded-full text-xs font-medium transition border';
  const subActive =
    'bg-stone-700 dark:bg-white/20 border-stone-700 dark:border-white/20 text-white';
  const subInactive =
    'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-stone-500 dark:text-white/40 hover:bg-black/8 dark:hover:bg-white/8';

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate('')}
          className={`${tabBase} ${!currentCategory ? tabActive : tabInactive}`}
        >
          전체
        </button>
        {COMMUNITY_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => navigate(cat.value)}
            className={`${tabBase} ${currentCategory === cat.value ? tabActive : tabInactive}`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* 서브카테고리 (선택된 카테고리에 subcategories가 있을 때만) */}
      {activeCat?.subcategories && (
        <div className="flex flex-wrap gap-2 pl-1">
          <button
            onClick={() => navigate(currentCategory)}
            className={`${subBase} ${!currentSub ? subActive : subInactive}`}
          >
            전체
          </button>
          {activeCat.subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => navigate(currentCategory, sub)}
              className={`${subBase} ${currentSub === sub ? subActive : subInactive}`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommunityCategoryFilter() {
  return (
    <Suspense>
      <FilterInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: community/page.tsx 업데이트**

`src/app/community/page.tsx` 전체를 아래로 교체:
```tsx
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import Pagination from '@/components/ui/Pagination';
import CommunityCategoryFilter from '@/components/ui/CommunityCategoryFilter';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';

const PAGE_SIZE = 10;

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; sub?: string }>;
}) {
  const { page: pageStr, category, sub } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  const db   = supabaseServer();

  let query = db
    .from('posts')
    .select(
      'id, title, category, subcategory, views, created_at, user_id, comments(count), post_likes(count)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (category) query = query.eq('category', category);
  if (sub) query = query.eq('subcategory', sub);

  const { data: posts, count, error } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const extraParams: Record<string, string> = {};
  if (category) extraParams.category = category;
  if (sub) extraParams.sub = sub;

  type PostRow = NonNullable<typeof posts>[number] & {
    comments: { count: number }[];
    post_likes: { count: number }[];
    subcategory: string | null;
  };

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="relative overflow-hidden border-b border-black/5 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">커뮤니티</p>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-white">푸드 토크</h1>
              <p className="text-stone-400 dark:text-white/40 text-sm mt-1">
                {error ? '불러오는 중...' : `${count ?? 0}개의 이야기`}
              </p>
            </div>
            <Link
              href="/community/write"
              className="px-5 py-2.5 rounded-full bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition"
            >
              + 글 쓰기
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <CommunityCategoryFilter />

        {error || !posts || posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">💬</span>
            <p className="text-stone-900 dark:text-white font-semibold text-lg">아직 게시글이 없습니다</p>
            <Link
              href="/community/write"
              className="px-6 py-3 rounded-full bg-emerald-500 text-black font-bold text-sm"
            >
              첫 글 쓰기
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {(posts as PostRow[]).map((post) => {
                const cat = COMMUNITY_CATEGORY_MAP[post.category] ?? COMMUNITY_CATEGORY_MAP['general'];
                const likeCount    = post.post_likes?.[0]?.count ?? 0;
                const commentCount = post.comments?.[0]?.count ?? 0;
                return (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="py-5 flex flex-col gap-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cat.color}`}>
                        {cat.emoji} {cat.label}
                      </span>
                      {post.subcategory && (
                        <span className="text-[10px] text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                          {post.subcategory}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-900 dark:text-white font-semibold text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition leading-snug">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-3 text-stone-400 dark:text-white/30 text-xs">
                      <span>{timeAgo(post.created_at)}</span>
                      <span>·</span>
                      <span>조회 {post.views}</span>
                      {likeCount > 0 && (<><span>·</span><span>❤️ {likeCount}</span></>)}
                      {commentCount > 0 && (<><span>·</span><span>💬 {commentCount}</span></>)}
                    </div>
                  </Link>
                );
              })}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              hrefBase="/community"
              extraParams={extraParams}
            />
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```
Expected: 출력 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/ui/CommunityCategoryFilter.tsx src/app/community/page.tsx
git commit -m "feat: 커뮤니티 카테고리 탭 필터 + 서브카테고리 드롭다운"
```

---

## Task 4: 커뮤니티 글쓰기 폼 업데이트 (7카테고리 + 서브카테고리)

**Files:**
- Modify: `src/app/community/write/page.tsx`

**Consumes:** `COMMUNITY_CATEGORIES` from `@/types/community`

- [ ] **Step 1: write/page.tsx 업데이트**

`src/app/community/write/page.tsx` 전체를 아래로 교체:
```tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { COMMUNITY_CATEGORIES } from '@/types/community';

function CommunityWriteContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get('id');
  const user         = useAuthStore((s) => s.user);
  const isLoading    = useAuthStore((s) => s.isLoading);

  const [category,    setCategory]    = useState('general');
  const [subcategory, setSubcategory] = useState('');
  const [title,       setTitle]       = useState('');
  const [content,     setContent]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [initLoading, setInitLoading] = useState(!!editId);
  const [error,       setError]       = useState('');

  const activeCat = COMMUNITY_CATEGORIES.find((c) => c.value === category);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (!editId) return;

    supabase
      .from('posts')
      .select('title, content, category, subcategory, user_id')
      .eq('id', editId)
      .single()
      .then(({ data }) => {
        if (!data || data.user_id !== user.id) { router.replace('/community'); return; }
        setTitle(data.title);
        setContent(data.content);
        setCategory(data.category);
        setSubcategory(data.subcategory ?? '');
        setInitLoading(false);
      });
  }, [editId, user, isLoading, router]);

  // 카테고리 변경 시 서브카테고리 초기화
  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setSubcategory('');
  };

  if (isLoading || initLoading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError('제목과 내용을 입력해주세요.'); return; }
    setLoading(true);
    setError('');

    const payload = {
      title:      title.trim(),
      content:    content.trim(),
      category,
      subcategory: subcategory || null,
    };

    if (editId) {
      const { error: err } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', editId)
        .eq('user_id', user.id);
      setLoading(false);
      if (err) { setError(err.message); return; }
      router.push(`/community/${editId}`);
      router.refresh();
    } else {
      const { data, error: err } = await supabase
        .from('posts')
        .insert({ user_id: user.id, ...payload })
        .select('id')
        .single();
      setLoading(false);
      if (err || !data) { setError(err?.message ?? '오류가 발생했습니다.'); return; }
      router.push(`/community/${data.id}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">커뮤니티</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
            {editId ? '글 수정' : '글 쓰기'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 카테고리 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">카테고리</label>
            <div className="grid grid-cols-4 gap-2">
              {COMMUNITY_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleCategoryChange(c.value)}
                  className={`py-3 rounded-xl border text-center transition flex flex-col gap-0.5 items-center ${
                    category === c.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-xs font-semibold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 서브카테고리 (subcategories가 있는 카테고리만) */}
          {activeCat?.subcategories && (
            <div className="flex flex-col gap-2">
              <label className="text-stone-600 dark:text-white/60 text-sm font-medium">
                세부 분류 <span className="text-stone-400 dark:text-white/30 font-normal">(선택)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSubcategory('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                    !subcategory
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  선택 안 함
                </button>
                {activeCat.subcategories.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubcategory(sub)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                      subcategory === sub
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                        : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 제목 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={10}
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition resize-none"
            />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-full border border-black/10 dark:border-white/10 text-stone-600 dark:text-white/60 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {loading ? (editId ? '수정 중...' : '등록 중...') : (editId ? '수정하기' : '게시하기')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CommunityWritePage() {
  return (
    <Suspense>
      <CommunityWriteContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```
Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/community/write/page.tsx
git commit -m "feat: 글쓰기 폼 — 7카테고리 + 서브카테고리 선택"
```

---

## Task 5: 커뮤니티 상세 페이지 — 서브카테고리 뱃지 + DmButton

**Files:**
- Create: `src/components/ui/DmButton.tsx`
- Modify: `src/app/community/[id]/page.tsx`

**Produces:** `DmButton` — targetUserId prop, 본인 글이면 null 반환

- [ ] **Step 1: DmButton 컴포넌트 생성**

`src/components/ui/DmButton.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function DmButton({ targetUserId }: { targetUserId: string }) {
  const user   = useAuthStore((s) => s.user);
  const router = useRouter();

  if (!user || user.id === targetUserId) return null;

  return (
    <button
      onClick={() => router.push(`/chat/dm/${targetUserId}`)}
      className="text-stone-400 dark:text-white/30 text-xs hover:text-emerald-500 transition flex items-center gap-1"
      title="DM 보내기"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      DM
    </button>
  );
}
```

- [ ] **Step 2: community/[id]/page.tsx — 서브카테고리 뱃지 + DmButton 추가**

기존 `src/app/community/[id]/page.tsx`에서:

1. import에 DmButton 추가:
```tsx
import DmButton from '@/components/ui/DmButton';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';
```

2. `CATEGORIES` 상수 제거 (COMMUNITY_CATEGORY_MAP으로 대체), `cat` 계산 수정:
```tsx
const cat = COMMUNITY_CATEGORY_MAP[post.category] ?? COMMUNITY_CATEGORY_MAP['general'];
```

3. 카테고리+메타 행에 서브카테고리 뱃지 추가:
```tsx
<div className="flex items-center gap-3 mb-4">
  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cat.color}`}>
    {cat.emoji} {cat.label}
  </span>
  {post.subcategory && (
    <span className="text-[10px] text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
      {post.subcategory}
    </span>
  )}
  <span className="text-stone-400 dark:text-white/30 text-xs">
    {new Date(post.created_at).toLocaleDateString('ko-KR')}
  </span>
  <span className="text-stone-400 dark:text-white/30 text-xs">조회 {post.views}</span>
</div>
```

4. 제목+수정/삭제/신고 행에 DmButton 추가 (PostAuthorActions 뒤에):
```tsx
<div className="flex items-start justify-between gap-4 mb-6">
  <h1 className="text-2xl font-bold text-stone-900 dark:text-white leading-snug">{post.title}</h1>
  <div className="flex items-center gap-3 shrink-0 pt-1">
    <DmButton targetUserId={post.user_id} />
    <ReportButton targetType="post" targetId={post.id} />
    <PostAuthorActions postId={post.id} authorId={post.user_id} />
    <AdminContentActions contentType="post" contentId={post.id} redirectTo="/community" />
  </div>
</div>
```

5. posts select에 `subcategory` 추가:
```tsx
db.from('posts').select('*, subcategory').eq('id', id).single()
```
(이미 `*` 셀렉트면 그대로 OK)

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```
Expected: 출력 없음

- [ ] **Step 4: 커밋**

```bash
git add src/components/ui/DmButton.tsx src/app/community/[id]/page.tsx
git commit -m "feat: 커뮤니티 상세 — 서브카테고리 뱃지 + DmButton"
```

---

## Task 6: 채팅 허브 페이지 `/chat`

**Files:**
- Create: `src/app/chat/page.tsx`

**Consumes:** `supabaseServer()` from `@/lib/supabaseServer`, `COMMUNITY_CATEGORY_MAP` from `@/types/community`

- [ ] **Step 1: 채팅 허브 페이지 생성**

`src/app/chat/page.tsx`:
```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';

async function getUser() {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export default async function ChatPage() {
  const user = await getUser();
  if (!user) redirect('/auth/login');

  const db = supabaseServer();

  const [{ data: fixedRooms }, { data: userRooms }] = await Promise.all([
    db.from('chat_rooms').select('id, name, description, category').eq('type', 'fixed').order('created_at'),
    db.from('chat_rooms').select('id, name, description, created_at').eq('type', 'user').order('created_at', { ascending: false }).limit(20),
  ]);

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">채팅</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">채팅 허브</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">오픈 채팅방에서 이야기를 나눠요</p>
        </div>

        {/* 고정 채팅방 */}
        <section className="mb-10">
          <h2 className="text-stone-700 dark:text-white/70 text-sm font-semibold mb-3">카테고리 채팅방</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(fixedRooms ?? []).map((room) => {
              const cat = room.category ? COMMUNITY_CATEGORY_MAP[room.category] : null;
              return (
                <Link
                  key={room.id}
                  href={`/chat/room/${room.id}`}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/8 dark:border-white/8 hover:bg-white/80 dark:hover:bg-white/8 transition group"
                >
                  <span className="text-2xl">{cat?.emoji ?? '💬'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-900 dark:text-white font-semibold text-sm truncate">{room.name}</p>
                    {room.description && (
                      <p className="text-stone-400 dark:text-white/40 text-xs truncate mt-0.5">{room.description}</p>
                    )}
                  </div>
                  <span className="text-stone-300 dark:text-white/20 group-hover:translate-x-0.5 transition-transform">›</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 유저 생성 채팅방 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-stone-700 dark:text-white/70 text-sm font-semibold">유저 채팅방</h2>
            <CreateRoomButton />
          </div>
          {(userRooms ?? []).length === 0 ? (
            <div className="py-12 text-center text-stone-400 dark:text-white/30 text-sm">
              아직 유저 채팅방이 없어요
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {(userRooms ?? []).map((room) => (
                <Link
                  key={room.id}
                  href={`/chat/room/${room.id}`}
                  className="py-3.5 flex items-center gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition group"
                >
                  <span className="text-xl">💬</span>
                  <p className="flex-1 text-stone-900 dark:text-white text-sm font-medium truncate">{room.name}</p>
                  <span className="text-stone-300 dark:text-white/20 text-sm group-hover:translate-x-0.5 transition-transform">›</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CreateRoomButton() {
  'use client';
  // 방 생성 모달은 Task 7에서 클라이언트 컴포넌트로 구현
  return (
    <Link
      href="/chat/room/create"
      className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold transition"
    >
      + 방 만들기
    </Link>
  );
}
```

> **주의:** `CreateRoomButton`의 `'use client'`는 파일 상단이 아니라 함수 내부에 있어서 Next.js에서 인식 안 됨. 별도 파일로 분리해야 함. Task 7에서 처리.

실제로는 아래처럼 단순 Link로 처리:
```tsx
<Link
  href="/chat/room/create"
  className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold transition"
>
  + 방 만들기
</Link>
```
(page.tsx의 `CreateRoomButton` 함수 없애고 인라인 Link로 대체)

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```
Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/chat/page.tsx
git commit -m "feat: 채팅 허브 페이지 /chat"
```

---

## Task 7: ChatRoomClient + 오픈 채팅방 페이지 + 방 생성 페이지

**Files:**
- Create: `src/components/ui/ChatRoomClient.tsx`
- Create: `src/app/chat/room/[roomId]/page.tsx`
- Create: `src/app/chat/room/create/page.tsx`

**Consumes:** `supabase` from `@/lib/supabase`, `useAuthStore` from `@/store/authStore`

- [ ] **Step 1: ChatRoomClient 생성**

`src/components/ui/ChatRoomClient.tsx`:
```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Props {
  roomId: string;
  roomName: string;
  initialMessages: Message[];
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoomClient({ roomId, roomName, initialMessages }: Props) {
  const user    = useAuthStore((s) => s.user);
  const router  = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent]   = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_room_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const send = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!content.trim() || sending) return;
    setSending(true);
    await supabase.from('chat_room_messages').insert({
      room_id: roomId,
      sender_id: user.id,
      content: content.trim(),
    });
    setContent('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-[#EDE8E2]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm">
        <h1 className="text-stone-900 dark:text-white font-bold text-lg">{roomName}</h1>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-center text-stone-400 dark:text-white/30 text-sm py-10">
            첫 메시지를 보내보세요
          </p>
        )}
        {messages.map((msg) => {
          const isMine = user?.id === msg.sender_id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-emerald-500 text-black rounded-br-sm'
                      : 'bg-white/70 dark:bg-white/10 text-stone-900 dark:text-white rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-stone-400 dark:text-white/25">
                  {timeLabel(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-[#EDE8E2]/80 dark:bg-[#0a0a0a]/80">
        <div className="flex gap-3">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={user ? '메시지를 입력하세요 (Enter 전송)' : '로그인 후 채팅할 수 있습니다'}
            disabled={!user}
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm placeholder-stone-400 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
          />
          <button
            onClick={send}
            disabled={sending || !content.trim() || !user}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 오픈 채팅방 페이지 생성**

`src/app/chat/room/[roomId]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import ChatRoomClient from '@/components/ui/ChatRoomClient';

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const db = supabaseServer();

  const [{ data: room }, { data: messages }] = await Promise.all([
    db.from('chat_rooms').select('id, name').eq('id', roomId).single(),
    db.from('chat_room_messages')
      .select('id, sender_id, content, created_at')
      .eq('room_id', roomId)
      .order('created_at')
      .limit(100),
  ]);

  if (!room) notFound();

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-16">
      <ChatRoomClient
        roomId={room.id}
        roomName={room.name}
        initialMessages={messages ?? []}
      />
    </main>
  );
}
```

- [ ] **Step 3: 방 생성 페이지 생성**

`src/app/chat/room/create/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function CreateRoomPage() {
  const user   = useAuthStore((s) => s.user);
  const router = useRouter();
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  if (!user) { router.replace('/auth/login'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('방 이름을 입력해주세요.'); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('chat_rooms')
      .insert({ name: name.trim(), description: description.trim() || null, type: 'user', creator_id: user.id })
      .select('id')
      .single();
    setLoading(false);
    if (err || !data) { setError(err?.message ?? '오류가 발생했습니다.'); return; }
    router.push(`/chat/room/${data.id}`);
  };

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">채팅</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">채팅방 만들기</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">방 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="채팅방 이름을 입력하세요"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-stone-600 dark:text-white/60 text-sm font-medium">
              설명 <span className="text-stone-400 dark:text-white/30 font-normal">(선택)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="어떤 채팅방인지 설명해주세요"
              className="px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-full border border-black/10 dark:border-white/10 text-stone-600 dark:text-white/60 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {loading ? '생성 중...' : '방 만들기'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```
Expected: 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add src/components/ui/ChatRoomClient.tsx src/app/chat/
git commit -m "feat: 오픈 채팅방 — ChatRoomClient + room 페이지 + 방 생성"
```

---

## Task 8: 1:1 DM 페이지

**Files:**
- Create: `src/app/chat/dm/[userId]/page.tsx`

**Consumes:** `get_or_create_conversation` RPC (Task 1에서 생성), `direct_messages` table, `useAuthStore`

- [ ] **Step 1: DM 페이지 생성**

`src/app/chat/dm/[userId]/page.tsx`:
```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function DmPage() {
  const params    = useParams();
  const targetId  = params.userId as string;
  const user      = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router    = useRouter();

  const [convId,    setConvId]    = useState<string | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [content,   setContent]   = useState('');
  const [sending,   setSending]   = useState(false);
  const [initDone,  setInitDone]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (user.id === targetId) { router.replace('/chat'); return; }

    // 대화방 조회 또는 생성 (RPC)
    // @ts-ignore – custom RPC
    supabase.rpc('get_or_create_conversation', { other_user: targetId }).then(({ data: cid }) => {
      if (!cid) return;
      setConvId(cid);

      // 초기 메시지 로드
      supabase
        .from('direct_messages')
        .select('id, sender_id, content, created_at, read_at')
        .eq('conversation_id', cid)
        .order('created_at')
        .limit(100)
        .then(({ data }) => {
          setMessages((data as Message[]) ?? []);
          setInitDone(true);
        });

      // 읽음 처리 (내가 받은 메시지 read_at 업데이트)
      supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', cid)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .then(() => {});
    });
  }, [isLoading, user, targetId, router]);

  useEffect(() => {
    if (!convId) return;
    const channel = supabase
      .channel(`chat:dm:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convId]);

  const send = async () => {
    if (!user || !convId || !content.trim() || sending) return;
    setSending(true);
    await supabase.from('direct_messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content: content.trim(),
    });
    setContent('');
    setSending(false);
  };

  if (isLoading || !initDone) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-16">
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
          <Link href="/chat" className="text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400/40 to-teal-500/40 flex items-center justify-center text-stone-900 dark:text-white text-xs font-bold">
            D
          </div>
          <span className="text-stone-900 dark:text-white font-semibold text-sm">다이렉트 메시지</span>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-center text-stone-400 dark:text-white/30 text-sm py-10">
              첫 메시지를 보내보세요
            </p>
          )}
          {messages.map((msg) => {
            const isMine = user?.id === msg.sender_id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? 'bg-emerald-500 text-black rounded-br-sm'
                        : 'bg-white/70 dark:bg-white/10 text-stone-900 dark:text-white rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-stone-400 dark:text-white/25">
                      {timeLabel(msg.created_at)}
                    </span>
                    {isMine && (
                      <span className="text-[10px] text-stone-400 dark:text-white/25">
                        {msg.read_at ? '읽음' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="px-6 py-4 border-t border-black/5 dark:border-white/5">
          <div className="flex gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="메시지를 입력하세요 (Enter 전송)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm placeholder-stone-400 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition"
            />
            <button
              onClick={send}
              disabled={sending || !content.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-40"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```
Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/chat/dm/
git commit -m "feat: 1:1 DM 페이지 — Supabase Realtime 구독 + 읽음 처리"
```

---

## Task 9: Navbar 채팅 아이콘 + ChatUnreadBadge

**Files:**
- Create: `src/components/ui/ChatUnreadBadge.tsx`
- Modify: `src/components/ui/Navbar.tsx`

**Consumes:** `direct_messages`, `direct_conversations` tables, `useAuthStore`

- [ ] **Step 1: ChatUnreadBadge 컴포넌트 생성**

`src/components/ui/ChatUnreadBadge.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function ChatUnreadBadge() {
  const user = useAuthStore((s) => s.user);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null)
        .filter(
          'conversation_id',
          'in',
          `(select id from direct_conversations where user1_id='${user.id}' or user2_id='${user.id}')`
        );
      setUnread(count ?? 0);
    };

    fetchUnread();

    const channel = supabase
      .channel(`chat:unread:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <Link
      href="/chat"
      className="relative w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white hover:bg-black/6 dark:hover:bg-white/6 transition border border-transparent hover:border-black/8 dark:hover:border-white/8"
      title="채팅"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Navbar에 ChatUnreadBadge 추가**

`src/components/ui/Navbar.tsx`의 import 상단에 추가:
```tsx
import ChatUnreadBadge from '@/components/ui/ChatUnreadBadge';
```

우측 유틸리티 `<div className="flex items-center gap-1.5 shrink-0">` 안에서 검색 아이콘 다음에 추가:
```tsx
{/* 채팅 */}
<ChatUnreadBadge />
```

(SearchIcon Link 바로 아래, 장바구니 Link 위에 삽입)

- [ ] **Step 3: 빌드 검증**

```bash
cd ~/Desktop/da-itda && npm run build 2>&1 | tail -15
```
Expected: `✓ Compiled successfully`, 에러 없음

- [ ] **Step 4: 커밋 및 푸시**

```bash
git add src/components/ui/ChatUnreadBadge.tsx src/components/ui/Navbar.tsx
git commit -m "feat: Navbar 채팅 아이콘 + 읽지 않은 DM 뱃지"
git push origin main
```

---

## 완료 체크리스트

- [ ] `supabase db push` 성공 (3개 마이그레이션)
- [ ] `/community` — 카테고리 탭 + 서브카테고리 드롭다운 동작
- [ ] `/community/write` — 7카테고리 + 서브카테고리 선택 저장
- [ ] `/community/[id]` — 서브카테고리 뱃지 + DM 버튼 표시
- [ ] `/chat` — 고정방 7개 + 유저 생성방 목록
- [ ] `/chat/room/[roomId]` — 실시간 채팅 동작
- [ ] `/chat/room/create` — 방 생성 후 해당 방으로 이동
- [ ] `/chat/dm/[userId]` — DM 실시간 동작 + 읽음 처리
- [ ] Navbar 채팅 아이콘 + 읽지 않은 DM 뱃지
- [ ] `npm run build` 에러 0개
