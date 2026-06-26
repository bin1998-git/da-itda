# 게시판 · 문의 강화 · 신고 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자유게시판 신설, 1:1 문의 강화(파일첨부·수정·삭제·관리자 답변), 신고 자동제재 시스템 구축, 헤더 드롭다운 추가

**Architecture:** Next.js 16 App Router + Supabase (PostgreSQL RLS + Storage). 자동제재는 Supabase DB 트리거로 구현해 클라이언트를 신뢰하지 않는다. 파일첨부는 Supabase Storage public bucket → `file_urls JSONB` 배열에 URL 저장.

**Tech Stack:** Next.js 16, React 19, Supabase JS v2, Tailwind CSS v4, TypeScript

## Global Constraints

- 배경색: `bg-[#EDE8E2] dark:bg-[#0a0a0a]`
- 최대 너비: `max-w-3xl mx-auto` (게시판/문의), `max-w-2xl mx-auto` (폼)
- 상단 패딩: `pt-20` (고정 헤더 높이 60px 대응)
- 관리자 체크: `useAuthStore((s) => s.isAdmin)`
- Supabase 클라이언트: `import { supabase } from '@/lib/supabase'` (client), `supabaseServer()` (server)
- RLS 패턴: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`
- 댓글 금지 체크: `comment_banned_until > now()`
- 게시 금지 체크: `post_banned_until > now()`

---

## File Map

### 신규 생성
| 파일 | 역할 |
|------|------|
| `supabase/migrations/20260626000010_board_schema.sql` | board_posts 테이블 + RLS |
| `supabase/migrations/20260626000020_penalties_and_files.sql` | profiles 제재 컬럼 + inquiries file_urls |
| `supabase/migrations/20260626000030_auto_penalty_trigger.sql` | 신고 자동제재 트리거 |
| `src/app/board/page.tsx` | 게시판 목록 (Server Component) |
| `src/app/board/[id]/page.tsx` | 게시판 상세 + 수정/삭제 |
| `src/app/board/write/page.tsx` | 관리자 게시글 작성/수정 + 파일첨부 |
| `src/app/admin/inquiries/page.tsx` | 관리자 1:1 문의 목록 + 인라인 답변 |

### 수정
| 파일 | 변경 내용 |
|------|-----------|
| `src/components/ui/Navbar.tsx` | 게시판 드롭다운 추가 |
| `src/components/ui/ReportButton.tsx` | 🚨 사이렌 아이콘 + 전체 사유 입력 + 제재 안내 |
| `src/app/inquiry/write/page.tsx` | 파일첨부 UI 추가 |
| `src/app/inquiry/[id]/page.tsx` | 본인 수정/삭제 버튼 추가 |
| `src/app/admin/reports/page.tsx` | 제재 해제 버튼 + 제재 현황 배지 추가 |

---

## Task 1: DB Migration — board_posts 테이블

**Files:**
- Create: `supabase/migrations/20260626000010_board_schema.sql`

- [ ] **Step 1: migration 파일 생성**

```sql
-- supabase/migrations/20260626000010_board_schema.sql
CREATE TABLE board_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  file_urls  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  view_count INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기
CREATE POLICY "board_posts_select" ON board_posts
  FOR SELECT USING (true);

-- 관리자만 작성
CREATE POLICY "board_posts_insert" ON board_posts
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 관리자만 수정
CREATE POLICY "board_posts_update" ON board_posts
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 관리자만 삭제
CREATE POLICY "board_posts_delete" ON board_posts
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX board_posts_created_at_idx ON board_posts(created_at DESC);

-- 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_board_view(post_id UUID)
RETURNS VOID AS $$
  UPDATE board_posts SET view_count = view_count + 1 WHERE id = post_id;
$$ LANGUAGE SQL SECURITY DEFINER;
```

- [ ] **Step 2: Supabase에 migration 적용**

```bash
cd ~/Desktop/da-itda
npx supabase db push
```

Expected: "Applying migration 20260626000010_board_schema.sql" 출력 확인

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260626000010_board_schema.sql
git commit -m "feat: add board_posts table with admin-only write RLS"
```

---

## Task 2: DB Migration — 제재 컬럼 + 파일첨부

**Files:**
- Create: `supabase/migrations/20260626000020_penalties_and_files.sql`

- [ ] **Step 1: migration 파일 생성**

```sql
-- supabase/migrations/20260626000020_penalties_and_files.sql

-- profiles에 제재 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS comment_banned_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_banned_until     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS products_blocked      BOOLEAN NOT NULL DEFAULT FALSE;

-- inquiries에 파일첨부 컬럼 추가
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS file_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- board_posts 수정 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER board_posts_updated_at
  BEFORE UPDATE ON board_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: Supabase에 migration 적용**

```bash
npx supabase db push
```

Expected: "Applying migration 20260626000020_penalties_and_files.sql" 출력 확인

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260626000020_penalties_and_files.sql
git commit -m "feat: add penalty columns to profiles, file_urls to inquiries"
```

---

## Task 3: DB Migration — 자동제재 트리거

**Files:**
- Create: `supabase/migrations/20260626000030_auto_penalty_trigger.sql`

제재 규칙:
- `hate` (욕설): 해당 유저 소유 콘텐츠 누적 3회 → 7일, 6회 → 30일, 9회+ → 영구 댓글금지
- `spam` (스팸): 누적 3회 → 7일, 6회+ → 30일 게시+댓글 금지
- `adult` (음란물): 누적 2회 → 30일, 4회+ → 영구 게시금지
- `fraud` (사기): 즉시 상품 전체 정지 + 재등록 차단

- [ ] **Step 1: migration 파일 생성**

```sql
-- supabase/migrations/20260626000030_auto_penalty_trigger.sql

CREATE OR REPLACE FUNCTION handle_report_auto_penalty()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user UUID;
  v_count       INT;
BEGIN
  -- 신고 대상 콘텐츠의 소유자 찾기
  CASE NEW.target_type
    WHEN 'comment' THEN
      SELECT user_id INTO v_target_user FROM comments  WHERE id = NEW.target_id::UUID;
    WHEN 'post' THEN
      SELECT user_id INTO v_target_user FROM posts     WHERE id = NEW.target_id::UUID;
    WHEN 'product' THEN
      SELECT user_id INTO v_target_user FROM products  WHERE id = NEW.target_id::UUID;
    WHEN 'media' THEN
      SELECT user_id INTO v_target_user FROM media_posts WHERE id = NEW.target_id::UUID;
    WHEN 'user' THEN
      v_target_user := NEW.target_id::UUID;
    ELSE
      RETURN NEW;
  END CASE;

  IF v_target_user IS NULL THEN RETURN NEW; END IF;

  -- ① 사기: 즉시 모든 상품 정지 + 재등록 차단
  IF NEW.reason = 'fraud' THEN
    UPDATE products SET status = 'suspended'
      WHERE seller_id = v_target_user AND status = 'active';
    UPDATE profiles SET products_blocked = TRUE WHERE id = v_target_user;
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
    -- v_count에 이번 신고도 포함되므로 기준을 3, 6, 9로
    IF    v_count >= 9 THEN
      UPDATE profiles SET comment_banned_until = '9999-12-31'::timestamptz WHERE id = v_target_user;
    ELSIF v_count >= 6 THEN
      UPDATE profiles SET comment_banned_until = GREATEST(COALESCE(comment_banned_until, now()), now()) + interval '30 days'
        WHERE id = v_target_user;
    ELSIF v_count >= 3 AND v_count % 3 = 0 THEN
      UPDATE profiles SET comment_banned_until = GREATEST(COALESCE(comment_banned_until, now()), now()) + interval '7 days'
        WHERE id = v_target_user;
    END IF;
    RETURN NEW;
  END IF;

  -- ③ 스팸: 누적 3회 → 7일, 6회+ → 30일 게시+댓글 금지
  IF NEW.reason = 'spam' THEN
    SELECT COUNT(*) INTO v_count
      FROM reports r
      WHERE r.reason = 'spam'
        AND r.target_id IN (
          SELECT id::TEXT FROM comments    WHERE user_id = v_target_user
          UNION ALL
          SELECT id::TEXT FROM posts       WHERE user_id = v_target_user
        );
    IF    v_count >= 6 THEN
      UPDATE profiles
        SET post_banned_until    = GREATEST(COALESCE(post_banned_until, now()), now()) + interval '30 days',
            comment_banned_until = GREATEST(COALESCE(comment_banned_until, now()), now()) + interval '30 days'
        WHERE id = v_target_user;
    ELSIF v_count >= 3 AND v_count % 3 = 0 THEN
      UPDATE profiles
        SET post_banned_until    = GREATEST(COALESCE(post_banned_until, now()), now()) + interval '7 days',
            comment_banned_until = GREATEST(COALESCE(comment_banned_until, now()), now()) + interval '7 days'
        WHERE id = v_target_user;
    END IF;
    RETURN NEW;
  END IF;

  -- ④ 음란물: 누적 2회 → 30일, 4회+ → 영구 게시금지
  IF NEW.reason = 'adult' THEN
    SELECT COUNT(*) INTO v_count
      FROM reports r
      WHERE r.reason = 'adult'
        AND r.target_id IN (
          SELECT id::TEXT FROM posts       WHERE user_id = v_target_user
          UNION ALL
          SELECT id::TEXT FROM media_posts WHERE user_id = v_target_user
        );
    IF    v_count >= 4 THEN
      UPDATE profiles SET post_banned_until = '9999-12-31'::timestamptz WHERE id = v_target_user;
    ELSIF v_count >= 2 AND v_count % 2 = 0 THEN
      UPDATE profiles
        SET post_banned_until = GREATEST(COALESCE(post_banned_until, now()), now()) + interval '30 days'
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
```

- [ ] **Step 2: Supabase에 migration 적용**

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260626000030_auto_penalty_trigger.sql
git commit -m "feat: auto-penalty trigger on report insert (hate/spam/adult/fraud)"
```

---

## Task 4: Supabase Storage 버킷 생성 (수동)

Supabase Dashboard에서 직접 생성해야 하는 항목 (CLI 미지원):

- [ ] **Step 1:** Supabase Dashboard → Storage → New Bucket
  - 이름: `board-files`, Public: ON
- [ ] **Step 2:** 두 번째 버킷 생성
  - 이름: `inquiry-files`, Public: ON
- [ ] **Step 3:** 각 버킷 Policy 설정 (RLS)
  - `board-files`: 누구나 읽기(SELECT), 관리자만 업로드(INSERT/DELETE)
  - `inquiry-files`: 로그인 유저 업로드 가능, 본인 파일만 삭제

> 버킷 생성 후 다음 Task 진행

---

## Task 5: Navbar 게시판 드롭다운

**Files:**
- Modify: `src/components/ui/Navbar.tsx`

- [ ] **Step 1: 게시판 드롭다운 state 추가 및 NAV_LINKS 위에 타입 정의 추가**

`Navbar.tsx` 상단에서 `NAV_LINKS` 배열 바로 위에 타입 추가, `useState` import에 `useRef` 추가:

```tsx
// NAV_LINKS 정의 위에 추가
const BOARD_SUB = [
  { href: '/board',   label: '게시판',   sub: '공지·소식' },
  { href: '/inquiry', label: '1:1 문의', sub: '문의 접수' },
];
```

- [ ] **Step 2: export default Navbar 함수 내부 state 추가**

`const [userMenuOpen, setUserMenuOpen] = useState(false);` 바로 아래에 추가:

```tsx
const [boardOpen, setBoardOpen] = useState(false);
```

- [ ] **Step 3: 데스크탑 네비 — 게시판 드롭다운 항목 삽입**

`{NAV_LINKS.map(...)}` 블록 닫는 `</div>` 바로 앞에 추가:

```tsx
{/* 게시판 드롭다운 */}
<div className="relative" onMouseEnter={() => setBoardOpen(true)} onMouseLeave={() => setBoardOpen(false)}>
  <button
    className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 border ${
      pathname.startsWith('/board') || pathname.startsWith('/inquiry')
        ? 'text-indigo-400 bg-indigo-500/12 border-indigo-500/20'
        : 'text-stone-500 dark:text-white/45 hover:text-stone-800 dark:hover:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
    }`}
  >
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6" />
    </svg>
    <span className="hidden lg:inline xl:hidden text-[13px]">게시판</span>
    <span className="hidden xl:flex flex-col leading-none gap-0.5">
      <span>게시판</span>
      <span className="text-[10px] font-normal text-stone-400 dark:text-white/25">공지·문의</span>
    </span>
    <svg className="w-2.5 h-2.5 ml-0.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
    {(pathname.startsWith('/board') || pathname.startsWith('/inquiry')) && (
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
    )}
  </button>

  {boardOpen && (
    <div className="absolute top-full left-0 mt-1 w-44 rounded-2xl bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/50 overflow-hidden py-1.5 z-50">
      {BOARD_SUB.map(({ href, label, sub }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition group"
        >
          <span className={`text-sm font-medium transition ${pathname.startsWith(href) ? 'text-indigo-400' : 'text-stone-700 dark:text-white/70 group-hover:text-stone-900 dark:group-hover:text-white'}`}>
            {label}
          </span>
          <span className="text-[11px] text-stone-400 dark:text-white/30 mt-0.5">{sub}</span>
        </Link>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 4: 모바일 메뉴에 게시판/문의 항목 추가**

모바일 메뉴 `<Link href="/notice"...>` 줄 바로 위에 추가:

```tsx
<Link href="/board"   onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl text-[13px] text-stone-500 dark:text-white/55 hover:text-stone-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/4 transition">게시판</Link>
```

그리고 기존 `<Link href="/inquiry"...>` 줄은 그대로 유지.

- [ ] **Step 5: 드롭다운 닫기 오버레이에 boardOpen 추가**

기존 `{userMenuOpen && (<div className="fixed inset-0 z-[-1]" onClick={() => setUserMenuOpen(false)} />)}` 바로 아래에:

```tsx
{boardOpen && (
  <div className="fixed inset-0 z-[49]" onClick={() => setBoardOpen(false)} />
)}
```

- [ ] **Step 6: 개발 서버 실행 후 드롭다운 동작 확인**

```bash
cd ~/Desktop/da-itda && npm run dev
```

브라우저에서 헤더 "게시판" 호버 시 드롭다운 [게시판] / [1:1 문의] 표시 확인

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Navbar.tsx
git commit -m "feat: add board dropdown menu to navbar"
```

---

## Task 6: 자유게시판 목록 페이지

**Files:**
- Create: `src/app/board/page.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/board/page.tsx
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import Pagination from '@/components/ui/Pagination';

const PAGE_SIZE = 10;

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Date(date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  const db   = supabaseServer();

  const { data: rows, count } = await db
    .from('board_posts')
    .select('id, title, file_urls, view_count, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const posts = rows ?? [];

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="relative overflow-hidden border-b border-black/5 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-1">BOARD</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">게시판</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">다잇다 공식 소식과 안내를 확인하세요</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">📋</span>
            <p className="text-stone-400 dark:text-white/40 text-sm">등록된 게시글이 없습니다</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/board/${p.id}`}
                  className="py-5 flex items-start gap-3 hover:bg-black/2 dark:hover:bg-white/2 -mx-2 px-2 rounded-xl transition group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {(p.file_urls as string[]).length > 0 && (
                        <span className="text-[10px] text-indigo-400/70 bg-indigo-500/8 px-2 py-0.5 rounded-full">
                          📎 {(p.file_urls as string[]).length}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-800 dark:text-white/80 font-medium text-sm group-hover:text-stone-900 dark:group-hover:text-white transition leading-snug">
                      {p.title}
                    </p>
                    <div className="flex items-center gap-3 text-stone-400 dark:text-white/25 text-xs mt-1.5">
                      <span>{timeAgo(p.created_at)}</span>
                      <span>·</span>
                      <span>조회 {p.view_count}</span>
                    </div>
                  </div>
                  <span className="text-stone-300 dark:text-white/20 text-sm shrink-0 group-hover:translate-x-0.5 transition-transform">›</span>
                </Link>
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} hrefBase="/board" extraParams={{}} />
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `/board` 접속 확인 (게시글 없음 빈 화면 정상)**

- [ ] **Step 3: Commit**

```bash
git add src/app/board/page.tsx
git commit -m "feat: board list page"
```

---

## Task 7: 게시판 상세 페이지

**Files:**
- Create: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/board/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface BoardPost {
  id: string;
  title: string;
  content: string;
  file_urls: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function fileName(url: string) {
  return decodeURIComponent(url.split('/').pop() ?? url).replace(/^\d+_/, '');
}

export default function BoardDetailPage() {
  const params   = useParams<{ id: string }>();
  const router   = useRouter();
  const isAdmin  = useAuthStore((s) => s.isAdmin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [post, setPost]       = useState<BoardPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase
      .from('board_posts')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        if (!data) { router.replace('/board'); return; }
        setPost(data as BoardPost);
        setLoading(false);
        supabase.rpc('increment_board_view', { post_id: params.id });
      });
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    setDeleting(true);
    await supabase.from('board_posts').delete().eq('id', params.id);
    router.push('/board');
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link href="/board" className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition">
            ← 게시판
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                href={`/board/write?id=${post.id}`}
                className="px-4 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/10 transition"
              >
                수정
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-stone-900 dark:text-white leading-snug mb-3">{post.title}</h1>
        <div className="flex items-center gap-3 text-stone-400 dark:text-white/30 text-xs mb-8">
          <span>{fmt(post.created_at)}</span>
          {post.updated_at !== post.created_at && <span>· 수정됨 {fmt(post.updated_at)}</span>}
          <span>· 조회 {post.view_count}</span>
        </div>

        <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 mb-6">
          <p className="text-stone-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        {post.file_urls.length > 0 && (
          <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-5">
            <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase mb-3">첨부파일</p>
            <div className="flex flex-col gap-2">
              {post.file_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-indigo-400 hover:text-indigo-300 transition group"
                >
                  <svg className="w-4 h-4 shrink-0 text-indigo-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="underline underline-offset-2 group-hover:underline">{fileName(url)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/board" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition">
            목록으로
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/board/[id]/page.tsx"
git commit -m "feat: board detail page with admin edit/delete"
```

---

## Task 8: 게시판 작성/수정 페이지 (관리자 전용 + 파일첨부)

**Files:**
- Create: `src/app/board/write/page.tsx`

`?id=<uuid>` 쿼리가 있으면 수정 모드, 없으면 작성 모드.

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/board/write/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function BoardWritePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get('id');
  const isAdmin      = useAuthStore((s) => s.isAdmin);
  const isLoading    = useAuthStore((s) => s.isLoading);
  const fileRef      = useRef<HTMLInputElement>(null);

  const [form, setForm]             = useState({ title: '', content: '' });
  const [existingUrls, setExisting] = useState<string[]>([]);
  const [newFiles, setNewFiles]     = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!isLoading && !isAdmin) { router.replace('/'); return; }
    if (editId) {
      supabase.from('board_posts').select('title, content, file_urls').eq('id', editId).single()
        .then(({ data }) => {
          if (data) {
            setForm({ title: data.title, content: data.content });
            setExisting(data.file_urls as string[]);
          }
        });
    }
  }, [isAdmin, isLoading, editId, router]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewFiles(Array.from(e.target.files ?? []));
  };

  const removeExisting = (url: string) => {
    setExisting((prev) => prev.filter((u) => u !== url));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploaded: string[] = [];
    for (const file of newFiles) {
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('board-files').upload(path, file);
      if (upErr) throw new Error('파일 업로드 실패: ' + upErr.message);
      const { data } = supabase.storage.from('board-files').getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!form.content.trim()) { setError('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const newUrls = await uploadFiles();
      const file_urls = [...existingUrls, ...newUrls];

      if (editId) {
        const { error: err } = await supabase
          .from('board_posts')
          .update({ title: form.title.trim(), content: form.content.trim(), file_urls })
          .eq('id', editId);
        if (err) throw err;
        router.push(`/board/${editId}`);
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        const { data, error: err } = await supabase
          .from('board_posts')
          .insert({ author_id: user!.id, title: form.title.trim(), content: form.content.trim(), file_urls })
          .select('id')
          .single();
        if (err) throw err;
        router.push(`/board/${data.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href={editId ? `/board/${editId}` : '/board'} className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition mb-8">
          ← {editId ? '상세로' : '게시판'}
        </Link>

        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-8">
          {editId ? '게시글 수정' : '새 게시글 작성'}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="제목을 입력해주세요"
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40 transition"
            />
          </div>

          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="내용을 입력해주세요"
              rows={12}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/40 transition resize-none"
            />
          </div>

          {/* 파일첨부 */}
          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">파일첨부</label>

            {existingUrls.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-3">
                {existingUrls.map((url, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8">
                    <span className="text-xs text-stone-500 dark:text-white/50 truncate">
                      {decodeURIComponent(url.split('/').pop() ?? url).replace(/^\d+_/, '')}
                    </span>
                    <button type="button" onClick={() => removeExisting(url)} className="text-rose-400 text-xs hover:text-rose-300 shrink-0">삭제</button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-stone-400 dark:text-white/30 text-sm hover:border-indigo-500/40 hover:text-indigo-400 transition"
            >
              📎 파일 선택 (복수 선택 가능)
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />

            {newFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {newFiles.map((f, i) => (
                  <p key={i} className="text-xs text-stone-400 dark:text-white/30 px-1">📄 {f.name}</p>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-400 transition disabled:opacity-40"
          >
            {submitting ? '저장 중...' : editId ? '수정하기' : '게시하기'}
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 관리자 계정으로 게시글 작성 + 파일첨부 동작 확인**

- [ ] **Step 3: Commit**

```bash
git add src/app/board/write/page.tsx
git commit -m "feat: board write/edit page with file attachment for admin"
```

---

## Task 9: 관리자 1:1 문의 관리 페이지

**Files:**
- Create: `src/app/admin/inquiries/page.tsx`

admin/notices/page.tsx 패턴과 동일. 인라인 답변 작성, 삭제.

- [ ] **Step 1: 파일 생성**

```tsx
// src/app/admin/inquiries/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Inquiry {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  file_urls: string[];
  user_profile?: { username: string | null; full_name: string | null; email?: string } | null;
}

const CAT_LABEL: Record<string, string> = {
  order: '주문/결제', shipping: '배송', product: '상품', general: '기타',
};
const STATUS_STYLE: Record<string, string> = {
  pending:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  answered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminInquiriesPage() {
  const router   = useRouter();
  const user     = useAuthStore((s) => s.user);
  const isAdmin  = useAuthStore((s) => s.isAdmin);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'pending' | 'answered' | 'all'>('pending');
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('inquiries')
      .select('*, profiles!user_id(username, full_name)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setInquiries(
      (data ?? []).map((d: Record<string, unknown>) => ({ ...d, user_profile: d.profiles })) as Inquiry[],
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin) { router.replace('/'); return; }
    load();
  }, [user, isLoading, isAdmin, router, load]);

  const submitAnswer = async (id: string) => {
    const answer = (answerMap[id] ?? '').trim();
    if (!answer) return;
    setProcessing(id);
    await supabase.from('inquiries').update({
      answer,
      status: 'answered',
      answered_at: new Date().toISOString(),
    }).eq('id', id);
    setProcessing(null);
    setAnswerMap((m) => { const n = { ...m }; delete n[id]; return n; });
    await load();
  };

  const deleteInquiry = async (id: string) => {
    if (!confirm('이 문의를 삭제하시겠습니까?')) return;
    setProcessing(id);
    await supabase.from('inquiries').delete().eq('id', id);
    setProcessing(null);
    await load();
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="relative overflow-hidden border-b border-black/5 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-blue-500/5" />
        <div className="max-w-3xl mx-auto px-6 py-10 relative">
          <p className="text-sky-400 text-xs font-semibold tracking-widest uppercase mb-1">ADMIN</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">1:1 문의 관리</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">접수된 문의를 확인하고 답변해주세요</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {(['pending', 'answered', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                filter === f
                  ? f === 'pending'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : f === 'answered'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                  : 'border-black/8 dark:border-white/8 text-stone-400 dark:text-white/40 hover:text-stone-700 dark:hover:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {f === 'pending' ? '미답변' : f === 'answered' ? '답변완료' : '전체'}
            </button>
          ))}
        </div>

        {inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">💬</span>
            <p className="text-stone-400 dark:text-white/40 text-sm">문의가 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {inquiries.map((q) => (
              <div
                key={q.id}
                className={`rounded-2xl border bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden ${
                  q.status === 'pending' ? 'border-amber-500/15' : 'border-black/6 dark:border-white/6'
                }`}
              >
                <button
                  className="w-full p-5 text-left flex items-start gap-3"
                  onClick={() => setExpanded((v) => (v === q.id ? null : q.id))}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[q.status] ?? STATUS_STYLE.pending}`}>
                        {q.status === 'pending' ? '미답변' : '답변완료'}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-white/30 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {CAT_LABEL[q.category] ?? '기타'}
                      </span>
                      {q.file_urls?.length > 0 && (
                        <span className="text-[10px] text-indigo-400/70">📎 {q.file_urls.length}</span>
                      )}
                    </div>
                    <p className="text-stone-800 dark:text-white/80 font-medium text-sm">{q.title}</p>
                    <div className="flex items-center gap-3 text-stone-400 dark:text-white/25 text-xs mt-1">
                      <span>{q.user_profile?.username ?? q.user_profile?.full_name ?? '회원'}</span>
                      <span>·</span>
                      <span>{fmt(q.created_at)}</span>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-stone-300 dark:text-white/20 shrink-0 mt-0.5 transition-transform ${expanded === q.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded === q.id && (
                  <div className="border-t border-black/5 dark:border-white/5 p-5 flex flex-col gap-4">
                    {/* 문의 내용 */}
                    <div className="rounded-xl bg-black/3 dark:bg-white/3 p-4">
                      <p className="text-stone-400 dark:text-white/25 text-xs font-semibold uppercase mb-2">문의 내용</p>
                      <p className="text-stone-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{q.content}</p>
                    </div>

                    {/* 파일 */}
                    {q.file_urls?.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {q.file_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                            📎 {decodeURIComponent(url.split('/').pop() ?? '').replace(/^\d+_/, '')}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* 기존 답변 */}
                    {q.answer && (
                      <div className="rounded-xl bg-sky-500/5 border border-sky-500/15 p-4">
                        <p className="text-sky-400 text-xs font-semibold uppercase mb-2">답변 내용</p>
                        <p className="text-stone-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{q.answer}</p>
                      </div>
                    )}

                    {/* 답변 입력 */}
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={answerMap[q.id] ?? ''}
                        onChange={(e) => setAnswerMap((m) => ({ ...m, [q.id]: e.target.value }))}
                        placeholder={q.answer ? '답변을 수정합니다...' : '답변을 입력하세요...'}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitAnswer(q.id)}
                          disabled={!answerMap[q.id]?.trim() || processing === q.id}
                          className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition disabled:opacity-40"
                        >
                          {processing === q.id ? '저장 중...' : q.answer ? '답변 수정' : '답변 등록'}
                        </button>
                        <button
                          onClick={() => deleteInquiry(q.id)}
                          disabled={processing === q.id}
                          className="px-5 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-sm font-semibold hover:bg-rose-500/10 transition disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `/admin` 페이지에서 "문의 관리" 링크 추가 확인**

`src/app/admin/page.tsx`에 `/admin/inquiries` 링크가 없으면 추가:

```bash
grep -n "inquiries\|notices\|reports" ~/Desktop/da-itda/src/app/admin/page.tsx
```

없으면 기존 notices/reports 카드 패턴으로 inquiries 카드 추가.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/inquiries/page.tsx
git commit -m "feat: admin 1:1 inquiry management page with inline answer"
```

---

## Task 10: 1:1 문의 파일첨부 (작성 페이지)

**Files:**
- Modify: `src/app/inquiry/write/page.tsx`

- [ ] **Step 1: 파일 업로드 로직 + UI 추가**

`handleSubmit` 내부 `supabase.from('inquiries').insert(...)` 직전에 파일 업로드 처리 추가. 전체 교체:

```tsx
// src/app/inquiry/write/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const CATS = [
  { value: 'order',    label: '주문/결제' },
  { value: 'shipping', label: '배송' },
  { value: 'product',  label: '상품' },
  { value: 'general',  label: '기타' },
];

export default function InquiryWritePage() {
  const router   = useRouter();
  const user     = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const fileRef  = useRef<HTMLInputElement>(null);

  const [form, setForm]       = useState({ category: 'general', title: '', content: '' });
  const [files, setFiles]     = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth/login');
  }, [user, isLoading, router]);

  const uploadFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('inquiry-files').upload(path, file);
      if (upErr) throw new Error('파일 업로드 실패: ' + upErr.message);
      const { data } = supabase.storage.from('inquiry-files').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (form.content.trim().length < 10) { setError('내용을 10자 이상 입력해주세요.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const file_urls = await uploadFiles();
      const { error: err } = await supabase.from('inquiries').insert({
        user_id:   user.id,
        title:     form.title.trim(),
        content:   form.content.trim(),
        category:  form.category,
        file_urls,
      });
      if (err) throw err;
      router.push('/inquiry');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '문의 등록에 실패했습니다.');
      setSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/inquiry" className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition mb-8">
          ← 문의 내역
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-8">1:1 문의하기</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">문의 유형</label>
            <div className="flex gap-2 flex-wrap">
              {CATS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    form.category === c.value
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      : 'border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="문의 제목을 입력해주세요"
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition"
            />
          </div>

          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="문의 내용을 자세히 입력해주세요 (10자 이상)"
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
            />
          </div>

          <div>
            <label className="text-stone-500 dark:text-white/40 text-xs font-semibold tracking-widest uppercase mb-2 block">파일첨부 (선택)</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-stone-400 dark:text-white/30 text-sm hover:border-sky-500/40 hover:text-sky-400 transition"
            >
              📎 파일 선택 (복수 선택 가능)
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {files.map((f, i) => <p key={i} className="text-xs text-stone-400 dark:text-white/30 px-1">📄 {f.name}</p>)}
              </div>
            )}
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-400 transition disabled:opacity-40"
          >
            {submitting ? '접수 중...' : '문의 접수하기'}
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/inquiry/write/page.tsx
git commit -m "feat: file attachment in inquiry write page"
```

---

## Task 11: 1:1 문의 수정/삭제 (상세 페이지)

**Files:**
- Modify: `src/app/inquiry/[id]/page.tsx`

기존 파일에서 `inquiry` fetch 후 수정/삭제 버튼, 수정 모달 추가.

- [ ] **Step 1: 수정/삭제 state + 핸들러 추가**

기존 `const [inquiry, setInquiry] = useState<Inquiry | null>(null);` 아래에 추가:

```tsx
const [editMode, setEditMode] = useState(false);
const [editContent, setEditContent] = useState('');
const [saving, setSaving] = useState(false);
const [deleting, setDeleting] = useState(false);
```

- [ ] **Step 2: handleEdit + handleDelete 함수 추가**

`if (!inquiry) return null;` 바로 위에 추가:

```tsx
const handleEdit = async () => {
  if (!editContent.trim()) return;
  setSaving(true);
  const { error } = await supabase
    .from('inquiries')
    .update({ content: editContent.trim() })
    .eq('id', params.id);
  setSaving(false);
  if (error) { alert('수정 실패: ' + error.message); return; }
  setInquiry((prev) => prev ? { ...prev, content: editContent.trim() } : prev);
  setEditMode(false);
};

const handleDelete = async () => {
  if (!confirm('문의를 삭제하시겠습니까?')) return;
  setDeleting(true);
  await supabase.from('inquiries').delete().eq('id', params.id);
  router.push('/inquiry');
};
```

- [ ] **Step 3: JSX — 헤더 수정/삭제 버튼 + 수정 모드 UI 추가**

`<Link href="/inquiry"...>← 문의 내역</Link>` 줄을 아래로 교체:

```tsx
<div className="flex items-center justify-between mb-8">
  <Link href="/inquiry" className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 text-sm transition">
    ← 문의 내역
  </Link>
  {/* 미답변 상태일 때만 수정/삭제 가능 */}
  {inquiry.status === 'pending' && (
    <div className="flex items-center gap-2">
      <button
        onClick={() => { setEditMode(true); setEditContent(inquiry.content); }}
        className="px-4 py-1.5 rounded-xl border border-sky-500/30 text-sky-400 text-xs font-semibold hover:bg-sky-500/10 transition"
      >
        수정
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-4 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition disabled:opacity-40"
      >
        삭제
      </button>
    </div>
  )}
</div>
```

그리고 `{/* 문의 내용 */}` 블록 전체를 아래로 교체:

```tsx
{/* 문의 내용 */}
<div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 mb-6">
  <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase mb-3">문의 내용</p>
  {editMode ? (
    <div className="flex flex-col gap-3">
      <textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        rows={6}
        className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
      />
      <div className="flex gap-2">
        <button onClick={handleEdit} disabled={saving}
          className="flex-1 py-2 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition disabled:opacity-40">
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={() => setEditMode(false)}
          className="px-5 py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
          취소
        </button>
      </div>
    </div>
  ) : (
    <p className="text-stone-700 dark:text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{inquiry.content}</p>
  )}
</div>
```

- [ ] **Step 4: 파일첨부 표시 추가 (답변 블록 아래에)**

기존 답변 블록(`{inquiry.status === 'answered'...}`) 앞에 추가:

```tsx
{/* 첨부파일 */}
{(inquiry as Inquiry & { file_urls?: string[] }).file_urls?.length ? (
  <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-5 mb-6">
    <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase mb-3">첨부파일</p>
    <div className="flex flex-col gap-2">
      {(inquiry as Inquiry & { file_urls: string[] }).file_urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
          className="text-sm text-sky-400 hover:text-sky-300 underline underline-offset-2">
          📎 {decodeURIComponent(url.split('/').pop() ?? '').replace(/^\d+_/, '')}
        </a>
      ))}
    </div>
  </div>
) : null}
```

그리고 `Inquiry` 인터페이스에 `file_urls?: string[]` 필드 추가.

- [ ] **Step 5: Commit**

```bash
git add "src/app/inquiry/[id]/page.tsx"
git commit -m "feat: inquiry detail - edit/delete (pending only) + file display"
```

---

## Task 12: 신고 버튼 강화 (🚨 사이렌 + 사유 입력 전체 허용)

**Files:**
- Modify: `src/components/ui/ReportButton.tsx`

- [ ] **Step 1: 버튼 UI를 사이렌 아이콘으로 변경 + 모든 이유에 사유 입력 허용**

`ReportButton.tsx` 전체 교체:

```tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface Props {
  targetType: 'post' | 'media' | 'product' | 'comment' | 'user';
  targetId: string;
  className?: string;
}

const REASONS = [
  { value: 'hate',      label: '욕설 / 혐오 발언',    desc: '3회 누적 시 7일 댓글 금지' },
  { value: 'spam',      label: '스팸 / 도배',          desc: '3회 누적 시 7일 게시 금지' },
  { value: 'fraud',     label: '사기 / 허위정보',      desc: '즉시 판매 정지 조치' },
  { value: 'adult',     label: '음란물 / 선정적 내용', desc: '2회 누적 시 30일 게시 금지' },
  { value: 'copyright', label: '저작권 침해',           desc: '관리자 검토 후 처리' },
  { value: 'other',     label: '기타',                 desc: '관리자 수동 처리' },
];

export default function ReportButton({ targetType, targetId, className = '' }: Props) {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [open, setOpen]       = useState(false);
  const [reason, setReason]   = useState('');
  const [detail, setDetail]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  if (isAdmin) return null;

  const handleOpen = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/auth/login');
      return;
    }
    const { data } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();
    setAlreadyReported(!!data);
    setReason('');
    setDetail('');
    setDone(false);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id:   targetId,
      reason,
      detail: detail.trim() || null,
    });
    setSubmitting(false);
    if (error) { alert('신고 접수 중 오류가 발생했습니다.'); return; }
    setDone(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        title="신고하기"
        className={`inline-flex items-center gap-1 text-stone-300 dark:text-white/20 hover:text-rose-400 text-xs transition ${className}`}
      >
        {/* 사이렌 아이콘 */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        신고
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 shadow-2xl p-6">

            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-stone-900 dark:text-white font-semibold">신고가 접수되었습니다</p>
                <p className="text-stone-400 dark:text-white/40 text-sm mt-1">검토 후 적절한 조치를 취하겠습니다.</p>
                <button onClick={() => setOpen(false)}
                  className="mt-5 px-6 py-2 rounded-xl bg-black/8 dark:bg-white/8 text-stone-600 dark:text-white/60 text-sm hover:bg-black/12 dark:hover:bg-white/12 transition">
                  닫기
                </button>
              </div>
            ) : alreadyReported ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-stone-900 dark:text-white font-semibold">이미 신고한 콘텐츠입니다</p>
                <p className="text-stone-400 dark:text-white/40 text-sm mt-1">이미 신고 접수되어 검토 중입니다.</p>
                <button onClick={() => setOpen(false)}
                  className="mt-5 px-6 py-2 rounded-xl bg-black/8 dark:bg-white/8 text-stone-600 dark:text-white/60 text-sm hover:bg-black/12 dark:hover:bg-white/12 transition">
                  닫기
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <svg className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <h2 className="text-stone-900 dark:text-white font-bold text-lg">신고하기</h2>
                </div>

                <div className="flex flex-col gap-2.5 mb-5">
                  {REASONS.map((r) => (
                    <label key={r.value}
                      onClick={() => setReason(r.value)}
                      className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition ${
                        reason === r.value
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : 'border-black/6 dark:border-white/6 hover:border-black/12 dark:hover:border-white/12 hover:bg-black/2 dark:hover:bg-white/2'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition ${
                        reason === r.value ? 'border-rose-500 bg-rose-500' : 'border-black/20 dark:border-white/20'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium transition ${reason === r.value ? 'text-stone-900 dark:text-white' : 'text-stone-600 dark:text-white/60'}`}>
                          {r.label}
                        </p>
                        <p className="text-[11px] text-stone-400 dark:text-white/30 mt-0.5">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {reason && (
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="신고 사유를 자세히 적어주세요 (선택)"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-white/20 text-sm focus:outline-none focus:border-rose-500/40 transition resize-none mb-4"
                  />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || submitting}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-400 transition disabled:opacity-40"
                  >
                    {submitting ? '접수 중...' : '신고 접수'}
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-stone-400 dark:text-white/40 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/ReportButton.tsx
git commit -m "feat: report button - siren icon, reason cards with desc, detail for all types"
```

---

## Task 13: 관리자 신고 페이지 — 제재 해제 버튼 추가

**Files:**
- Modify: `src/app/admin/reports/page.tsx`

기존 파일에 제재 해제 기능 + 처리된 신고에 제재 현황 배지 추가.

- [ ] **Step 1: `unbanUser` 함수 추가**

기존 `resolve`, `dismiss`, `deleteContent` 함수들 아래에 추가:

```tsx
const unbanUser = async (targetType: string, targetId: string) => {
  // target_id에서 user_id 찾기 (user 타입이면 targetId가 바로 user_id)
  let userId: string | null = null;
  if (targetType === 'user') {
    userId = targetId;
  } else {
    const tableMap: Record<string, string> = {
      comment: 'comments', post: 'posts', product: 'products', media: 'media_posts',
    };
    const tbl = tableMap[targetType];
    if (tbl) {
      const { data } = await supabase.from(tbl).select('user_id').eq('id', targetId).single();
      userId = data?.user_id ?? null;
    }
  }
  if (!userId) { alert('유저를 찾을 수 없습니다.'); return; }
  if (!confirm('이 유저의 제재를 해제하시겠습니까?')) return;
  setProcessing(targetId);
  await supabase.from('profiles').update({
    comment_banned_until: null,
    post_banned_until:    null,
    products_blocked:     false,
  }).eq('id', userId);
  setProcessing(null);
  alert('제재가 해제되었습니다.');
};
```

- [ ] **Step 2: 액션 버튼에 제재 해제 버튼 추가**

기존 `{r.status === 'pending' && (...)}` 블록의 버튼 목록에 "신고 무시" 버튼 바로 뒤에 추가:

```tsx
<button
  onClick={() => unbanUser(r.target_type, r.target_id)}
  disabled={processing === r.id}
  className="px-4 py-2 rounded-xl border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition disabled:opacity-50"
>
  제재 해제
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/reports/page.tsx
git commit -m "feat: admin reports - add unban user button"
```

---

## Task 14: 최종 확인 및 Admin 페이지 링크 연결

**Files:**
- Modify: `src/app/admin/page.tsx` (링크 추가만)

- [ ] **Step 1: admin/page.tsx에 문의 관리 링크 있는지 확인**

```bash
grep -n "inquiries" ~/Desktop/da-itda/src/app/admin/page.tsx
```

없으면 기존 notices/reports 카드 패턴으로 `/admin/inquiries` 카드 추가.

- [ ] **Step 2: 전체 빌드 오류 없는지 확인**

```bash
cd ~/Desktop/da-itda && npm run build 2>&1 | tail -30
```

Expected: 오류 없이 빌드 완료

- [ ] **Step 3: 개발 서버에서 전체 플로우 확인**

1. `/board` — 목록 정상 렌더링
2. 관리자 로그인 → `/board/write` → 게시글 작성 + 파일첨부
3. `/board/:id` → 수정/삭제 버튼 표시 확인
4. `/inquiry/write` → 파일첨부 UI 표시 확인
5. `/inquiry/:id` → 수정/삭제 버튼 (미답변 상태 문의만)
6. `/admin/inquiries` → 문의 목록 + 답변 입력 확인
7. 신고 버튼 → 사이렌 아이콘 + 사유 카드 UI 확인
8. 헤더 → "게시판" 호버 시 드롭다운 표시 확인

- [ ] **Step 4: 최종 Commit**

```bash
git add -A
git commit -m "feat: board, inquiry enhancements, report siren, admin inquiries - full feature set"
```
