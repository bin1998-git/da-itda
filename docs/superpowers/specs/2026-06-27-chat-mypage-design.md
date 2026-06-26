# Chat 구조 개편 + 마이페이지 채팅 탭 설계

Date: 2026-06-27

## 목표

1. 채팅 구조를 Discord/카카오 오픈채팅처럼 카테고리→방 2단계로 변경
2. 명시적 참여(join)/나가기(leave) 기능 추가
3. 마이페이지(Dashboard)에 채팅 탭 추가 (참여한 방 / 내가 만든 방)
4. 채팅 UI를 카카오톡 스타일 버블로 개선

---

## DB 변경

### 추가: `chat_room_members`

```sql
CREATE TABLE chat_room_members (
  room_id    UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
-- 본인 레코드만 조회/삽입/삭제 가능
CREATE POLICY "members_select" ON chat_room_members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON chat_room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete" ON chat_room_members FOR DELETE USING (auth.uid() = user_id);
```

기존 테이블(`chat_rooms`, `chat_room_messages`, `direct_conversations`, `direct_messages`) 구조 변경 없음.

---

## 라우트 구조

| 경로 | 역할 |
|---|---|
| `/chat` | 카테고리 그리드 (기존 고정방 목록 → 카테고리 허브로 전환) |
| `/chat/category/[category]` | 해당 카테고리 방 목록 + 방 만들기 |
| `/chat/room/[roomId]` | 실제 채팅방 (참여/나가기 포함) |
| `/chat/room/create` | 삭제 또는 카테고리 페이지로 리다이렉트 |

---

## 화면별 상세 설계

### `/chat` — 카테고리 허브

- 기존 고정 채팅방(type='fixed')의 `category` 값으로 카테고리 그리드 렌더링
- 각 카테고리 카드: 이모지 + 이름 + 방 수(count)
- 클릭 → `/chat/category/[category]`

### `/chat/category/[category]` — 방 목록

- 해당 category의 user 타입 방 목록 (고정방 제외)
- 각 방 카드: 방 이름 + 참여자 수 + 최근 메시지 미리보기 + 생성일
- "방 만들기" 버튼 → 인라인 모달(방 이름 입력) → `chat_rooms` INSERT (type='user', category=현재카테고리)
- Server Component + Client 인터랙션 분리

### `/chat/room/[roomId]` — 채팅방

**참여 상태 분기:**
- 비참여자: 메시지 입력창 숨김, "참여하기" 버튼 표시
- 참여자: 메시지 입력 + 상단 "나가기" 버튼

**참여하기:** `chat_room_members` INSERT → 입력창 활성화  
**나가기:** `chat_room_members` DELETE → 비참여 상태로 전환 (메시지 기록은 유지)

**채팅 UI (카카오톡 스타일):**
- 내 메시지: 오른쪽 정렬, amber 배경 버블
- 상대방 메시지: 왼쪽 정렬, 회색 배경 버블 + 이니셜 아바타 + 이름
- 날짜가 바뀌면 날짜 구분선 표시 (e.g. `2026년 6월 27일`)
- 연속 메시지(같은 발신자 1분 이내)는 아바타/이름 생략
- Supabase Realtime 구독 유지

### Dashboard — 채팅 탭

- 기존 탭 목록에 `chat` 탭 추가 (label: '채팅방')
- 서브탭: "참여한 방" / "내가 만든 방"
- 각 방 카드: 방 이름 + 카테고리 배지 + 최근 메시지 미리보기 + 바로가기 링크
- "참여한 방" = `chat_room_members`에 내 레코드가 있는 방
- "내가 만든 방" = `chat_rooms.creator_id = user.id`

---

## 파일 변경 목록

| 파일 | 변경 유형 |
|---|---|
| `supabase/migrations/…_chat_members.sql` | 신규 |
| `src/app/chat/page.tsx` | 수정 (카테고리 허브로) |
| `src/app/chat/category/[category]/page.tsx` | 신규 |
| `src/components/ui/ChatRoomClient.tsx` | 수정 (참여/나가기, 카카오톡 UI) |
| `src/app/dashboard/page.tsx` | 수정 (채팅 탭 추가) |

---

## 비기능 요건

- 채팅 기록: 나가기 후에도 메시지 보존 (삭제 안 함)
- 참여자 수: `chat_room_members` count로 실시간 표시
- 관리자는 채팅 탭 표시 (기존 likes/wishlist 숨김 패턴과 동일하게 판단)
