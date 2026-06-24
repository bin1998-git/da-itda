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
| Deploy | (예정) |

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── auth/
│   │   ├── callback/
│   │   │   └── exchange/
│   │   │       ├── page.tsx          # Suspense 래퍼
│   │   │       └── ExchangeHandler.tsx  # PKCE 코드 교환 (Client)
│   │   ├── login/
│   │   │   ├── page.tsx              # Suspense 래퍼
│   │   │   └── LoginForm.tsx         # 로그인 폼 (Client)
│   │   └── signup/                   # 회원가입 페이지
│   ├── dashboard/                    # 메인 대시보드 (로그인 필요)
│   ├── not-found.tsx                 # 404 페이지
│   ├── layout.tsx                    # 전역 레이아웃 (AuthProvider, Navbar)
│   └── page.tsx                      # 홈 페이지 (Server Component, 풀 리디자인)
├── components/ui/
│   ├── AuthProvider.tsx              # 세션 자동 감지 및 전역 상태 동기화
│   ├── HiggsfieldHero.tsx            # animated Hero 섹션 (CSS 그라디언트 + orb)
│   └── Navbar.tsx                    # 로그인 상태 반영 네비게이션
├── lib/
│   └── supabase.ts                   # Supabase 클라이언트 싱글톤
└── store/
    └── authStore.ts                  # Zustand 유저 상태 관리
```

---

## 🗄️ DB 스키마

```sql
profiles          -- 사용자 프로필 (auth.users 확장)
modules           -- 서비스 모듈 레지스트리 (commerce/media/community)
higgsfield_assets -- 힉스필드 영상 자산 관리
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
| **8** | **홈 페이지 풀 리디자인 — animated Hero, 가치 섹션, 모듈 카드, CTA, 푸터** | **2026-06-24** |

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

- [ ] **Phase 9: 식품 마켓 (Commerce)**
  - 상품 목록 페이지 (`/market`)
  - 상품 상세 페이지 (`/market/[id]`)
  - 판매자 등록 플로우
  - 장바구니 / 결제 (포트원 or Stripe)
- [ ] Phase 10: 푸드 미디어 (Higgsfield 영상 업로드/재생)
- [ ] Phase 11: 커뮤니티 (게시판, 댓글, 좋아요)
- [ ] Phase 12: Vercel 배포 (환경변수, 도메인, Supabase redirect URL)
