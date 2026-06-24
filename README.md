# 다잇다 (Da-itda)

> **"Connect Everything, Your All-in-One Platform"**
> 사용자의 다양한 요구사항을 하나의 플랫폼으로 연결하는 모듈형 서비스 허브

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (PKCE) |
| State | Zustand |
| Deploy | Vercel |

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── auth/              # 로그인·회원가입·PKCE 콜백
│   ├── dashboard/         # 메인 대시보드 (로그인 필요)
│   ├── market/            # 식품 마켓 (목록·상세·판매자 등록)
│   ├── media/             # 푸드 미디어 (영상 목록·재생·업로드)
│   ├── community/         # 푸드 토크 (게시글·댓글·좋아요)
│   ├── cart/              # 장바구니
│   ├── search/            # 통합 검색 (마켓·미디어·커뮤니티)
│   ├── ranking/           # 인기 TOP 10
│   ├── events/            # 할인·프로모션
│   ├── terms/             # 이용약관
│   ├── privacy/           # 개인정보처리방침
│   ├── not-found.tsx      # 404 페이지
│   ├── layout.tsx         # 전역 레이아웃 (AuthProvider, Navbar, Footer)
│   └── page.tsx           # 홈 페이지 (Server Component)
├── components/ui/
│   ├── AuthProvider.tsx       # 세션 자동 감지 및 전역 상태 동기화
│   ├── HiggsfieldHero.tsx     # animated Hero 섹션
│   ├── Navbar.tsx             # 5탭 + 검색·장바구니 + 로그인 드롭다운
│   ├── Footer.tsx             # 4컬럼 푸터
│   ├── CategoryFilter.tsx     # 마켓 카테고리 탭 필터
│   ├── AddToCartButton.tsx    # 수량 선택 + 장바구니 담기
│   ├── VideoPlayer.tsx        # 커스텀 HTML5 플레이어
│   ├── LikeButton.tsx         # 미디어 좋아요 토글
│   ├── CommentSection.tsx     # 댓글 목록 + 입력 (낙관적 업데이트)
│   └── PostLikeButton.tsx     # 게시글 좋아요 토글
├── lib/
│   ├── supabase.ts            # 클라이언트 Supabase 싱글톤
│   └── supabaseServer.ts      # 서버 컴포넌트용 Supabase 팩토리
├── types/
│   ├── market.ts              # Product, Seller, Category 타입
│   └── media.ts               # MediaPost 타입
└── store/
    └── authStore.ts           # Zustand 유저 상태 관리
```

---

## 🗄️ DB 스키마

```sql
profiles          -- 사용자 프로필 (auth.users 확장)
modules           -- 서비스 모듈 레지스트리 (commerce/media/community)
higgsfield_assets -- 힉스필드 영상 자산 관리
sellers           -- 판매자 정보
products          -- 상품 (카테고리, 가격, 재고)
cart_items        -- 장바구니 (user-product 매핑)
media_posts       -- 레시피 영상 (썸네일, 조회수)
media_likes       -- 영상 좋아요 (user-post 매핑)
posts             -- 커뮤니티 게시글 (카테고리, 조회수)
post_likes        -- 게시글 좋아요
comments          -- 댓글 (게시글 연결)
```

모든 테이블 RLS(Row Level Security) 적용

---

## 🚀 로컬 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]

# 개발 서버 실행
npm run dev
```

---

## 🔐 인증 플로우

```
회원가입 → 이메일 발송 → 이메일 클릭
→ /auth/callback (PKCE 코드 교환)
→ /dashboard (자동 로그인)
```

---

## 🛠️ 현재까지 완료된 작업 이력

| Phase | 내용 | 날짜 |
|-------|------|------|
| 0 | Next.js 프로젝트 초기화, Supabase·Zustand 설치, GitHub 연동 | 2026-06-24 |
| 1 | DB 스키마 설계 (profiles, modules, higgsfield_assets), RLS 적용 | 2026-06-24 |
| 2 | 회원가입·로그인·로그아웃, PKCE 이메일 인증 콜백, 대시보드 | 2026-06-24 |
| 3 | HiggsfieldHero 컴포넌트, 404 페이지 | 2026-06-24 |
| 4 | Google OAuth 소셜 로그인 연동 | 2026-06-24 |
| 5 | 카카오 OAuth 소셜 로그인 연동 (닉네임/프로필 사진) | 2026-06-24 |
| 6 | Navbar 프로필 사진 연동 (소셜 avatar + 이니셜 폴백) | 2026-06-24 |
| 7 | 대시보드 UI — 시간대별 인사말, 스탯 카드, 모듈 카드 | 2026-06-24 |
| 8 | 홈 페이지 풀 리디자인 — animated Hero, 가치 섹션, 모듈 카드, CTA, 푸터 | 2026-06-24 |
| 9 | 식품 마켓 — 상품 목록·상세·판매자 등록·장바구니, sellers/products/cart_items DB | 2026-06-24 |
| 10 | 푸드 미디어 — 영상 목록·재생·업로드, 좋아요, VideoPlayer 컴포넌트 | 2026-06-24 |
| 11 | 커뮤니티 — 게시글 목록·상세·작성, 댓글, 좋아요 / Navbar·Footer 전면 리디자인 / 검색·랭킹·이벤트·이용약관·개인정보처리방침 | 2026-06-24 |

---

## 🔐 소셜 로그인

| Provider | 상태 | 비고 |
|----------|------|------|
| 이메일/비밀번호 | ✅ 완료 | PKCE 이메일 인증 |
| Google | ✅ 완료 | 프로필 사진·이름 연동 |
| 카카오 | ✅ 완료 | 닉네임·프로필 사진 연동 (이메일 무료 미지원) |
| Apple | ⏸️ 보류 | 개발자 계정 $99/년 필요 |

---

## 🚀 다음에 진행해야 할 액션 플랜

- [x] Phase 9: 식품 마켓 (Commerce)
- [x] Phase 10: 푸드 미디어
- [x] Phase 11: 커뮤니티
- [ ] **Phase 12: 마이페이지** — 프로필 수정, 내 주문 내역, 내 게시글, 내 영상, 찜 목록
- [ ] Phase 13: 대시보드 실데이터 연동 — 실제 DB 집계 기반 스탯 카드
- [ ] Phase 14: 결제 연동 (포트원 or Stripe)
