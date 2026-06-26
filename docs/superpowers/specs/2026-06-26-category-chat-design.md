# 커뮤니티 카테고리 재설계 + 채팅 시스템 설계

**날짜:** 2026-06-26  
**플랫폼:** 다잇다 (음식·주방용품 모듈형 올인원 플랫폼)  
**스택:** Next.js 15 App Router · Supabase (PostgreSQL + Realtime) · Tailwind CSS v4

---

## 1. 커뮤니티 카테고리 재설계

### 1-1. 카테고리 구조 (7개 + 서브카테고리)

| value | 라벨 | 색상 | 서브카테고리 |
|---|---|---|---|
| `recipe` | 레시피 | amber | 한식 / 양식 / 일식 / 중식 / 디저트·베이킹 |
| `ingredient` | 재료·식품 | green | 채소·과일 / 육류·해산물 / 유제품 / 가공식품 / 조미료 |
| `kitchenware` | 주방용품 | indigo | 조리도구 / 냄비·팬 / 식기 / 보관용품 / 소형가전 |
| `restaurant` | 맛집 | rose | 서울 / 경기·인천 / 지방 / 해외 |
| `tip` | 꿀팁 | yellow | 보관법 / 손질법 / 절약팁 / 플레이팅 |
| `question` | 질문 | sky | (서브 없음) |
| `general` | 자유 | stone | (서브 없음) |

### 1-2. DB 변경

- `posts` 테이블에 `subcategory TEXT` 컬럼 추가 (nullable, 기존 데이터 호환)
- 마이그레이션: `20260626000060_posts_subcategory.sql`

### 1-3. UI 변경

**커뮤니티 목록 (`/community`)**
- 상단에 카테고리 탭 필터 추가 (전체 + 7개 = 8탭)
- URL searchParam: `?category=recipe&page=1`
- 선택된 카테고리 하단에 서브카테고리 드롭다운 표시 (서브 없는 카테고리는 숨김)
- URL searchParam: `?category=recipe&sub=한식&page=1`

**글쓰기 폼 (`/community/write`)**
- 카테고리 버튼 7개로 확장
- 카테고리 선택 시 서브카테고리 드롭다운 조건부 표시
- 서브카테고리는 선택사항 (필수 아님)

**게시글 상세 (`/community/[id]`)**
- 카테고리 뱃지 옆에 서브카테고리 뱃지 추가 표시 (있을 경우)

---

## 2. 채팅 시스템

### 2-1. 아키텍처

Supabase Realtime (PostgreSQL logical replication + websocket) 사용.  
이미 `NotificationBell`에서 동일 패턴 사용 중 — 코드 패턴 일치.

### 2-2. DB 스키마 (4개 테이블)

```sql
-- 오픈 채팅방
chat_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL CHECK (type IN ('fixed', 'user')),  -- fixed: 카테고리 고정방
  category    TEXT,          -- fixed 방일 때 카테고리 값
  creator_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
)

-- 오픈 채팅방 메시지
chat_room_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- 1:1 DM 대화 (두 유저 쌍)
direct_conversations (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id)  -- 중복 방지
)

-- DM 메시지
direct_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,  -- NULL이면 안읽음
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

RLS: 모든 테이블에 Row Level Security 적용 (본인 메시지만 insert, 참여한 방/대화만 select)

### 2-3. 고정 채팅방 시드 데이터

앱 최초 실행 시 7개 고정방 자동 생성 (migration seed):
- 🍳 레시피방 / 🥦 재료·식품방 / 🔪 주방용품방 / 🗺️ 맛집방 / 💡 꿀팁방 / ❓ 질문방 / 💬 자유방

### 2-4. 페이지 구조

| 경로 | 설명 |
|---|---|
| `/chat` | 채팅 허브 — 오픈방 목록 + 내 DM 목록 탭 |
| `/chat/room/[roomId]` | 오픈 채팅방 (고정방 + 유저 생성방) |
| `/chat/dm/[userId]` | 1:1 DM (userId로 대화 자동 생성/조회) |

### 2-5. 실시간 구현 패턴

```ts
// 오픈 채팅방 구독
supabase.channel(`chat:room:${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_room_messages',
    filter: `room_id=eq.${roomId}`,
  }, (payload) => setMessages(prev => [...prev, payload.new]))
  .subscribe()

// DM 구독
supabase.channel(`chat:dm:${conversationId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => setMessages(prev => [...prev, payload.new]))
  .subscribe()
```

### 2-6. UI 진입점

- **Navbar**: 채팅 아이콘 + 읽지 않은 DM 수 뱃지
- **커뮤니티 글 상세**: 작성자 옆 "DM" 버튼 (본인 글 제외)
- **마켓 상품 상세**: 판매자에게 DM 버튼
- **채팅 허브 `/chat`**: 오픈방 + DM 탭 구분

### 2-7. 컴포넌트 목록

**신규 생성:**
- `src/app/chat/page.tsx` — 채팅 허브
- `src/app/chat/room/[roomId]/page.tsx` — 오픈 채팅방
- `src/app/chat/dm/[userId]/page.tsx` — 1:1 DM
- `src/components/ui/ChatRoomClient.tsx` — 실시간 채팅 UI (공통)
- `src/components/ui/DmButton.tsx` — DM 진입 버튼 (게시글/상품 상세용)
- `src/components/ui/ChatUnreadBadge.tsx` — Navbar 뱃지

**수정:**
- `Navbar.tsx` — 채팅 아이콘 + 뱃지 추가
- `community/[id]/page.tsx` — DmButton 추가
- `market/[id]/page.tsx` — DmButton 추가
- `community/page.tsx` — 카테고리 탭 필터 + 서브카테고리 드롭다운
- `community/write/page.tsx` — 카테고리 7개 + 서브카테고리 드롭다운

---

## 3. 마이그레이션 순서

1. `20260626000060_posts_subcategory.sql` — posts 서브카테고리 컬럼
2. `20260626000070_chat_schema.sql` — 채팅 4개 테이블 + RLS
3. `20260626000080_chat_seed.sql` — 고정 채팅방 7개 시드

---

## 4. 구현 순서

1. DB 마이그레이션 3개
2. 카테고리 재설계 (목록 필터 + 글쓰기 폼 + 상세 뱃지)
3. 채팅 허브 + 오픈 채팅방
4. 1:1 DM
5. Navbar 채팅 아이콘 + 뱃지
6. DmButton 게시글/상품 연동
