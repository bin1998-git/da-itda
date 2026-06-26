# Chat 구조 개편 + 마이페이지 채팅 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅을 카테고리→방 2단계 구조로 개편하고, 명시적 참여/나가기 기능 및 마이페이지 채팅 탭을 추가한다.

**Architecture:** `chat_room_members` 테이블로 참여 상태를 관리. `/chat`은 카테고리 허브, `/chat/category/[category]`에서 방 목록과 방 만들기. `ChatRoomClient`에 참여/나가기 로직과 카카오톡 스타일 UI 적용. Dashboard에 채팅 탭 추가.

**Tech Stack:** Next.js 15 (App Router), Supabase (PostgreSQL + Realtime), TypeScript, Tailwind CSS v4

## Global Constraints

- 모든 파일은 기존 다크/라이트 모드 클래스(`bg-[#EDE8E2] dark:bg-[#0a0a0a]`) 유지
- `supabase` (client) vs `supabaseServer()` (server) 구분 필수 — 서버 컴포넌트는 항상 `supabaseServer()`
- `COMMUNITY_CATEGORY_MAP` import 경로: `@/types/community`
- `useAuthStore` import 경로: `@/store/authStore`
- 마이그레이션 파일명 패턴: `20260627XXXXXX_<name>.sql`
- `supabase db push` 로컬 실행 필요 (실행 명령은 각 태스크에 명시)

---

## File Map

| 파일 | 작업 |
|---|---|
| `supabase/migrations/20260627000010_chat_members.sql` | 신규 생성 |
| `src/app/chat/page.tsx` | 수정 — 카테고리 허브로 전환 |
| `src/app/chat/category/[category]/page.tsx` | 신규 생성 |
| `src/components/ui/ChatRoomClient.tsx` | 수정 — 참여/나가기 + 카카오톡 UI |
| `src/app/chat/room/[roomId]/page.tsx` | 수정 — isMember + memberCount 전달 |
| `src/app/dashboard/page.tsx` | 수정 — 채팅 탭 추가 |

---

## Task 1: DB 마이그레이션 — chat_room_members

**Files:**
- Create: `supabase/migrations/20260627000010_chat_members.sql`

**Interfaces:**
- Produces: `chat_room_members(room_id, user_id, joined_at)` 테이블

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/20260627000010_chat_members.sql
CREATE TABLE chat_room_members (
  room_id   UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON chat_room_members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON chat_room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete" ON chat_room_members FOR DELETE
  USING (auth.uid() = user_id);
CREATE INDEX chat_room_members_user_idx ON chat_room_members(user_id);
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
cd /Users/jeongbin/Desktop/da-itda
supabase db push
```
Expected: `Applying migration 20260627000010_chat_members.sql... done`

---

## Task 2: `/chat` 페이지 — 카테고리 허브로 전환

**Files:**
- Modify: `src/app/chat/page.tsx`

**Interfaces:**
- Consumes: `COMMUNITY_CATEGORIES` from `@/types/community`
- Consumes: `chat_rooms` 테이블 (category별 count)

- [ ] **Step 1: `/chat/page.tsx` 전체 교체**

```tsx
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { COMMUNITY_CATEGORIES } from '@/types/community';

export default async function ChatPage() {
  const db = supabaseServer();

  // 카테고리별 방 수 조회
  const { data: rooms } = await db
    .from('chat_rooms')
    .select('category')
    .eq('type', 'user');

  const countByCategory: Record<string, number> = {};
  (rooms ?? []).forEach((r) => {
    if (r.category) countByCategory[r.category] = (countByCategory[r.category] ?? 0) + 1;
  });

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">채팅</p>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">채팅 허브</h1>
          <p className="text-stone-400 dark:text-white/40 text-sm mt-1">카테고리를 선택해 채팅방에 참여하세요</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COMMUNITY_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/chat/category/${cat.value}`}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/8 dark:border-white/8 hover:bg-white/80 dark:hover:bg-white/8 transition group"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-stone-900 dark:text-white font-semibold text-sm">{cat.label}</p>
                <p className="text-stone-400 dark:text-white/40 text-xs mt-0.5">
                  방 {countByCategory[cat.value] ?? 0}개
                </p>
              </div>
              <span className="text-stone-300 dark:text-white/20 group-hover:translate-x-0.5 transition-transform text-lg">›</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/jeongbin/Desktop/da-itda
npx tsc --noEmit
```
Expected: 에러 0개

---

## Task 3: `/chat/category/[category]` 페이지 — 방 목록 + 방 만들기

**Files:**
- Create: `src/app/chat/category/[category]/page.tsx`

**Interfaces:**
- Consumes: `chat_rooms(id, name, description, creator_id, created_at)` where `type='user' AND category=?`
- Consumes: `chat_room_members` count per room
- Consumes: `chat_room_messages` (최근 1개, 미리보기)
- Produces: 방 카드 목록 + 인라인 방 만들기 폼

- [ ] **Step 1: 디렉토리 생성 및 파일 작성**

```tsx
// src/app/chat/category/[category]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';
import { COMMUNITY_CATEGORY_MAP } from '@/types/community';
import CategoryChatClient from './CategoryChatClient';

export default async function CategoryChatPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = COMMUNITY_CATEGORY_MAP[category];
  if (!cat) notFound();

  const db = supabaseServer();

  const { data: rooms } = await db
    .from('chat_rooms')
    .select('id, name, description, creator_id, created_at')
    .eq('type', 'user')
    .eq('category', category)
    .order('created_at', { ascending: false });

  // 방별 멤버 수 + 최근 메시지
  const roomIds = (rooms ?? []).map((r) => r.id);

  const [{ data: memberCounts }, { data: lastMessages }] = await Promise.all([
    roomIds.length > 0
      ? db.from('chat_room_members').select('room_id').in('room_id', roomIds)
      : Promise.resolve({ data: [] }),
    roomIds.length > 0
      ? db
          .from('chat_room_messages')
          .select('room_id, content, created_at')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const memberCountMap: Record<string, number> = {};
  (memberCounts ?? []).forEach((m) => {
    memberCountMap[m.room_id] = (memberCountMap[m.room_id] ?? 0) + 1;
  });

  const lastMsgMap: Record<string, { content: string; created_at: string }> = {};
  (lastMessages ?? []).forEach((msg) => {
    if (!lastMsgMap[msg.room_id]) lastMsgMap[msg.room_id] = msg;
  });

  const enrichedRooms = (rooms ?? []).map((r) => ({
    ...r,
    memberCount: memberCountMap[r.id] ?? 0,
    lastMessage: lastMsgMap[r.id] ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/chat" className="text-stone-400 dark:text-white/30 text-sm hover:text-stone-600 dark:hover:text-white/60 transition">채팅</Link>
          <span className="text-stone-300 dark:text-white/20 text-sm">›</span>
        </div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">카테고리</p>
            <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
              {cat.emoji} {cat.label}
            </h1>
          </div>
        </div>

        <CategoryChatClient
          category={category}
          catLabel={cat.label}
          initialRooms={enrichedRooms}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: CategoryChatClient 작성**

```tsx
// src/app/chat/category/[category]/CategoryChatClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface RoomItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  lastMessage: { content: string; created_at: string } | null;
}

interface Props {
  category: string;
  catLabel: string;
  initialRooms: RoomItem[];
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function CategoryChatClient({ category, catLabel, initialRooms }: Props) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomItem[]>(initialRooms);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!name.trim()) { setError('방 이름을 입력해주세요.'); return; }
    setCreating(true);
    const { data, error: err } = await supabase
      .from('chat_rooms')
      .insert({
        name: name.trim(),
        description: desc.trim() || null,
        type: 'user',
        category,
        creator_id: user.id,
      })
      .select('id')
      .single();
    setCreating(false);
    if (err || !data) { setError(err?.message ?? '오류가 발생했습니다.'); return; }
    router.push(`/chat/room/${data.id}`);
  };

  return (
    <div>
      {/* 방 만들기 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-stone-500 dark:text-white/40 text-sm">{rooms.length}개의 채팅방</p>
        <button
          onClick={() => { setShowForm((v) => !v); setError(''); }}
          className="text-xs px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/25 transition font-semibold"
        >
          + 방 만들기
        </button>
      </div>

      {/* 방 만들기 폼 */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-3">
          <p className="text-stone-700 dark:text-white/70 text-sm font-semibold">{catLabel} 채팅방 만들기</p>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="방 이름"
            className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition text-sm"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="설명 (선택)"
            className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder-stone-300 dark:placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition text-sm"
          />
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setName(''); setDesc(''); setError(''); }}
              className="flex-1 py-2 rounded-xl border border-black/10 dark:border-white/10 text-stone-500 dark:text-white/50 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              취소
            </button>
            <button
              onClick={createRoom}
              disabled={creating}
              className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {creating ? '생성 중...' : '만들기'}
            </button>
          </div>
        </div>
      )}

      {/* 방 목록 */}
      {rooms.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-stone-400 dark:text-white/30 text-sm">아직 채팅방이 없어요</p>
          <p className="text-stone-300 dark:text-white/20 text-xs mt-1">첫 번째 방을 만들어보세요!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/room/${room.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/8 dark:border-white/8 hover:bg-white/80 dark:hover:bg-white/8 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 font-bold text-sm shrink-0">
                {room.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-stone-900 dark:text-white font-semibold text-sm truncate">{room.name}</p>
                  <span className="text-stone-400 dark:text-white/30 text-xs shrink-0">👥 {room.memberCount}</span>
                </div>
                <p className="text-stone-400 dark:text-white/35 text-xs truncate mt-0.5">
                  {room.lastMessage ? room.lastMessage.content : (room.description ?? '대화를 시작해보세요')}
                </p>
              </div>
              {room.lastMessage && (
                <span className="text-stone-300 dark:text-white/20 text-xs shrink-0">{fmtDate(room.lastMessage.created_at)}</span>
              )}
              <span className="text-stone-300 dark:text-white/20 group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/jeongbin/Desktop/da-itda
npx tsc --noEmit
```
Expected: 에러 0개

---

## Task 4: ChatRoomClient — 참여/나가기 + 카카오톡 UI

**Files:**
- Modify: `src/components/ui/ChatRoomClient.tsx`
- Modify: `src/app/chat/room/[roomId]/page.tsx`

**Interfaces:**
- Consumes (새 props): `isMember: boolean`, `memberCount: number`
- `chat_room_messages`에 sender profile join 필요 — server page에서 profiles 별도 조회 후 전달

- [ ] **Step 1: `/chat/room/[roomId]/page.tsx` 수정 — isMember + profiles 전달**

```tsx
// src/app/chat/room/[roomId]/page.tsx
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
    db
      .from('chat_room_messages')
      .select('id, sender_id, content, created_at')
      .eq('room_id', roomId)
      .order('created_at')
      .limit(100),
  ]);

  if (!room) notFound();

  // 메시지 발신자 프로필 일괄 조회
  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))];
  const { data: profiles } =
    senderIds.length > 0
      ? await db
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', senderIds)
      : { data: [] };

  const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
  (profiles ?? []).forEach((p) => {
    profileMap[p.id] = {
      name: p.full_name || p.username || '익명',
      avatar_url: p.avatar_url || null,
    };
  });

  // 멤버 수 조회 (서버에서 — isMember는 클라이언트에서 확인)
  const { count: memberCount } = await db
    .from('chat_room_members')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);

  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-16">
      <ChatRoomClient
        roomId={room.id}
        roomName={room.name}
        initialMessages={messages ?? []}
        profileMap={profileMap}
        initialMemberCount={memberCount ?? 0}
      />
    </main>
  );
}
```

- [ ] **Step 2: `ChatRoomClient.tsx` 전체 교체 — 카카오톡 스타일 + 참여/나가기**

```tsx
// src/components/ui/ChatRoomClient.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  name: string;
  avatar_url: string | null;
}

interface Props {
  roomId: string;
  roomName: string;
  initialMessages: Message[];
  profileMap: Record<string, Profile>;
  initialMemberCount: number;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isSameMinute(a: string, b: string) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() &&
    da.getHours() === db.getHours() &&
    da.getMinutes() === db.getMinutes();
}

export default function ChatRoomClient({
  roomId,
  roomName,
  initialMessages,
  profileMap: initialProfileMap,
  initialMemberCount,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>(initialProfileMap);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(initialMemberCount);
  const [memberChecked, setMemberChecked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 참여 여부 확인
  useEffect(() => {
    if (!user) { setMemberChecked(true); return; }
    supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsMember(!!data);
        setMemberChecked(true);
      });
  }, [user, roomId]);

  // 스크롤 하단 고정
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel(`chat:room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_room_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          // 발신자 프로필 없으면 조회
          if (!profileMap[msg.sender_id]) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .eq('id', msg.sender_id)
              .single();
            if (data) {
              setProfileMap((prev) => ({
                ...prev,
                [data.id]: { name: data.full_name || data.username || '익명', avatar_url: data.avatar_url },
              }));
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, profileMap]);

  const join = async () => {
    if (!user) { router.push('/auth/login'); return; }
    const { error } = await supabase
      .from('chat_room_members')
      .insert({ room_id: roomId, user_id: user.id });
    if (!error) {
      setIsMember(true);
      setMemberCount((c) => c + 1);
    }
  };

  const leave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('chat_room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);
    if (!error) {
      setIsMember(false);
      setMemberCount((c) => Math.max(0, c - 1));
    }
  };

  const send = async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!content.trim() || sending || !isMember) return;
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
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-[#EDE8E2]/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center gap-3">
        <Link href="/chat" className="text-stone-400 dark:text-white/30 hover:text-stone-600 dark:hover:text-white/60 transition text-sm">
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-stone-900 dark:text-white font-bold text-base truncate">{roomName}</h1>
          <p className="text-stone-400 dark:text-white/30 text-xs">👥 {memberCount}명</p>
        </div>
        {memberChecked && user && isMember && (
          <button
            onClick={leave}
            className="text-xs px-3 py-1.5 rounded-lg text-stone-400 dark:text-white/30 hover:text-rose-400 hover:bg-rose-500/8 transition border border-black/8 dark:border-white/8"
          >
            나가기
          </button>
        )}
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {messages.length === 0 && (
          <p className="text-center text-stone-400 dark:text-white/30 text-sm py-10">
            첫 메시지를 보내보세요
          </p>
        )}
        {messages.map((msg, idx) => {
          const isMine = user?.id === msg.sender_id;
          const prev = messages[idx - 1];
          const next = messages[idx + 1];

          // 날짜 구분선
          const showDate = !prev || !isSameDay(prev.created_at, msg.created_at);
          // 연속 메시지 그룹화 (같은 발신자, 1분 이내)
          const isGrouped = !!prev && prev.sender_id === msg.sender_id && isSameMinute(prev.created_at, msg.created_at);
          const isLastInGroup = !next || next.sender_id !== msg.sender_id || !isSameMinute(msg.created_at, next.created_at);

          const profile = profileMap[msg.sender_id];
          const displayName = isMine ? '' : (profile?.name ?? '익명');
          const initial = displayName[0]?.toUpperCase() ?? '?';

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
                  <span className="text-stone-400 dark:text-white/30 text-xs">{dateLabel(msg.created_at)}</span>
                  <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
                </div>
              )}
              <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
                {/* 상대방 아바타 */}
                {!isMine && (
                  <div className="w-8 shrink-0 self-end mb-0.5">
                    {!isGrouped && (
                      <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-white/10 flex items-center justify-center text-stone-600 dark:text-white/60 text-xs font-bold">
                        {initial}
                      </div>
                    )}
                  </div>
                )}

                <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {/* 이름 (상대방, 그룹 첫 메시지만) */}
                  {!isMine && !isGrouped && (
                    <span className="text-stone-500 dark:text-white/40 text-xs mb-1 ml-1">{displayName}</span>
                  )}
                  <div className="flex items-end gap-1.5">
                    {/* 시간 (내 메시지 왼쪽) */}
                    {isMine && isLastInGroup && (
                      <span className="text-[10px] text-stone-400 dark:text-white/25 mb-0.5">{timeLabel(msg.created_at)}</span>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                        isMine
                          ? 'bg-amber-400 text-black rounded-br-sm'
                          : 'bg-white/80 dark:bg-white/10 text-stone-900 dark:text-white rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {/* 시간 (상대방 메시지 오른쪽) */}
                    {!isMine && isLastInGroup && (
                      <span className="text-[10px] text-stone-400 dark:text-white/25 mb-0.5">{timeLabel(msg.created_at)}</span>
                    )}
                  </div>
                </div>

                {/* 내 아바타 자리 (오른쪽 정렬 유지용) */}
                {isMine && <div className="w-8 shrink-0" />}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 / 참여하기 버튼 */}
      <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 bg-[#EDE8E2]/90 dark:bg-[#0a0a0a]/90">
        {!memberChecked ? null : !user ? (
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition"
          >
            로그인 후 채팅하기
          </button>
        ) : !isMember ? (
          <button
            onClick={join}
            className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition"
          >
            채팅방 참여하기
          </button>
        ) : (
          <div className="flex gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="메시지를 입력하세요 (Enter 전송)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white text-sm placeholder-stone-400 dark:placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition"
            />
            <button
              onClick={send}
              disabled={sending || !content.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition disabled:opacity-40"
            >
              전송
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/jeongbin/Desktop/da-itda
npx tsc --noEmit
```
Expected: 에러 0개

---

## Task 5: Dashboard — 채팅 탭 추가

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `chat_room_members(room_id)` join `chat_rooms(id, name, category, creator_id)`
- Consumes: `chat_room_messages(content, created_at)` (최근 1개 per room)

- [ ] **Step 1: `Tab` 타입에 `chat` 추가**

`dashboard/page.tsx`의 `type Tab` 라인을 찾아 수정:
```ts
// 기존
type Tab = 'overview' | 'profile' | 'posts' | 'media' | 'likes' | 'wishlist';
// 변경
type Tab = 'overview' | 'profile' | 'posts' | 'media' | 'likes' | 'wishlist' | 'chat';
```

- [ ] **Step 2: `TABS` 배열에 채팅방 탭 추가**

```ts
// 기존 TABS 배열 마지막에 추가
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: '개요' },
  { id: 'profile',   label: '프로필 수정' },
  { id: 'posts',     label: '내 게시글' },
  { id: 'media',     label: '내 영상' },
  { id: 'likes',     label: '찜 목록' },
  { id: 'wishlist',  label: '위시리스트' },
  { id: 'chat',      label: '채팅방' },   // ← 추가
];
```

- [ ] **Step 3: ChatRoom 관련 state + interface 추가**

파일 상단 interface 블록 아래에 추가:
```ts
interface ChatRoomItem {
  id: string;
  name: string;
  category: string | null;
  creator_id: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
}
```

state 선언부(`const [wishlist...` 아래)에 추가:
```ts
const [myChatRooms, setMyChatRooms] = useState<ChatRoomItem[]>([]);
const [createdChatRooms, setCreatedChatRooms] = useState<ChatRoomItem[]>([]);
const [chatSubTab, setChatSubTab] = useState<'joined' | 'created'>('joined');
```

- [ ] **Step 4: tab === 'chat' 데이터 로드 추가**

`useEffect` (tab data load) 안에, `if (tab === 'wishlist')` 블록 다음에 추가:
```ts
if (tab === 'chat') {
  setTabLoading(true);

  // 참여한 방
  supabase
    .from('chat_room_members')
    .select('room_id, chat_rooms(id, name, category, creator_id)')
    .eq('user_id', user.id)
    .then(async ({ data }) => {
      const rooms = (data ?? []).map((d: any) => d.chat_rooms).filter(Boolean) as {
        id: string; name: string; category: string | null; creator_id: string | null;
      }[];
      const roomIds = rooms.map((r) => r.id);
      const { data: msgs } = roomIds.length > 0
        ? await supabase
            .from('chat_room_messages')
            .select('room_id, content, created_at')
            .in('room_id', roomIds)
            .order('created_at', { ascending: false })
        : { data: [] };
      const lastMap: Record<string, { content: string; created_at: string }> = {};
      (msgs ?? []).forEach((m: any) => { if (!lastMap[m.room_id]) lastMap[m.room_id] = m; });
      setMyChatRooms(rooms.map((r) => ({
        ...r,
        lastMessage: lastMap[r.id]?.content ?? null,
        lastMessageAt: lastMap[r.id]?.created_at ?? null,
      })));
    });

  // 내가 만든 방
  supabase
    .from('chat_rooms')
    .select('id, name, category, creator_id')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .then(async ({ data }) => {
      const rooms = data ?? [];
      const roomIds = rooms.map((r) => r.id);
      const { data: msgs } = roomIds.length > 0
        ? await supabase
            .from('chat_room_messages')
            .select('room_id, content, created_at')
            .in('room_id', roomIds)
            .order('created_at', { ascending: false })
        : { data: [] };
      const lastMap: Record<string, { content: string; created_at: string }> = {};
      (msgs ?? []).forEach((m: any) => { if (!lastMap[m.room_id]) lastMap[m.room_id] = m; });
      setCreatedChatRooms(rooms.map((r) => ({
        ...r,
        lastMessage: lastMap[r.id]?.content ?? null,
        lastMessageAt: lastMap[r.id]?.created_at ?? null,
      })));
      setTabLoading(false);
    });
}
```

- [ ] **Step 5: 채팅방 탭 UI 추가**

`{tab === 'wishlist' && (...)}` 블록 닫는 태그 바로 뒤에 추가:
```tsx
{/* ────────────── 채팅방 탭 ────────────── */}
{tab === 'chat' && (
  <div className="space-y-5">
    <p className="text-stone-400 dark:text-white/25 text-xs font-semibold tracking-widest uppercase">채팅방</p>

    {/* 서브탭 */}
    <div className="flex gap-2">
      {([['joined', '참여한 방'], ['created', '내가 만든 방']] as ['joined' | 'created', string][]).map(([id, label]) => (
        <button key={id} onClick={() => setChatSubTab(id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
            chatSubTab === id
              ? 'bg-black/8 dark:bg-white/8 border-black/15 dark:border-white/15 text-stone-900 dark:text-white'
              : 'border-transparent text-stone-400 dark:text-white/35 hover:text-stone-600 dark:hover:text-white/60'
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    {tabLoading ? (
      <div className="flex justify-center py-16">
        <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    ) : (() => {
      const list = chatSubTab === 'joined' ? myChatRooms : createdChatRooms;
      if (list.length === 0) return (
        <div className="rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] p-12 text-center">
          <p className="text-stone-400 dark:text-white/30 text-sm">
            {chatSubTab === 'joined' ? '참여한 채팅방이 없습니다.' : '만든 채팅방이 없습니다.'}
          </p>
          <a href="/chat" className="mt-2 inline-block text-emerald-400/60 hover:text-emerald-400 text-xs transition">채팅 허브 가기 →</a>
        </div>
      );
      return (
        <div className="flex flex-col gap-2">
          {list.map((room) => (
            <a key={room.id} href={`/chat/room/${room.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/4 dark:hover:bg-white/4 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 font-bold text-sm shrink-0">
                {room.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-stone-700 dark:text-white/70 text-sm font-semibold truncate">{room.name}</p>
                <p className="text-stone-400 dark:text-white/30 text-xs truncate mt-0.5">
                  {room.lastMessage ?? '아직 메시지가 없습니다'}
                </p>
              </div>
              <span className="text-stone-300 dark:text-white/20 text-sm group-hover:translate-x-0.5 transition-transform">›</span>
            </a>
          ))}
        </div>
      );
    })()}
  </div>
)}
```

- [ ] **Step 6: 빌드 확인 및 커밋**

```bash
cd /Users/jeongbin/Desktop/da-itda
npx tsc --noEmit
```
Expected: 에러 0개

```bash
git add supabase/migrations/20260627000010_chat_members.sql \
  src/app/chat/page.tsx \
  src/app/chat/category \
  src/components/ui/ChatRoomClient.tsx \
  src/app/chat/room/[roomId]/page.tsx \
  src/app/dashboard/page.tsx \
  docs/superpowers/specs/2026-06-27-chat-mypage-design.md \
  docs/superpowers/plans/2026-06-27-chat-mypage.md

git commit -m "feat: 채팅 카테고리 허브 구조 + 참여/나가기 + 마이페이지 채팅 탭"
```

---

## Self-Review

**Spec coverage 체크:**
- ✅ chat_room_members 테이블 (Task 1)
- ✅ /chat → 카테고리 허브 (Task 2)
- ✅ /chat/category/[category] 방 목록 + 방 만들기 (Task 3)
- ✅ 참여하기/나가기 버튼 (Task 4)
- ✅ 카카오톡 스타일 UI: amber 버블, 날짜 구분선, 이름/아바타, 연속 메시지 그룹화 (Task 4)
- ✅ Dashboard 채팅 탭 — 참여한 방 / 내가 만든 방 (Task 5)
- ✅ 채팅 기록 나가도 보존 (DELETE는 members만, messages 건드리지 않음)

**Type consistency 체크:**
- `ChatRoomItem` — Task 5 전체에서 동일 구조 사용
- `profileMap: Record<string, Profile>` — page.tsx → ChatRoomClient props 일치
- `isMember`, `memberCount` — Task 4 page.tsx와 ChatRoomClient props 일치 (initialMemberCount로 전달)

**Placeholder scan:** 없음.
