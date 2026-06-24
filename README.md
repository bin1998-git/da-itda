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
│   │   ├── callback/      # 이메일 인증 콜백 (PKCE 코드 교환)
│   │   ├── login/         # 로그인 페이지
│   │   └── signup/        # 회원가입 페이지
│   ├── dashboard/         # 메인 대시보드 (로그인 필요)
│   ├── not-found.tsx      # 404 페이지
│   ├── layout.tsx         # 전역 레이아웃 (AuthProvider, Navbar)
│   └── page.tsx           # 메인 홈 (Higgsfield Hero)
├── components/ui/
│   ├── AuthProvider.tsx   # 세션 자동 감지 및 전역 상태 동기화
│   ├── HiggsfieldHero.tsx # 영상 Hero 섹션 모듈 (재사용 가능)
│   └── Navbar.tsx         # 로그인 상태 반영 네비게이션
├── lib/
│   └── supabase.ts        # Supabase 클라이언트 싱글톤
└── store/
    └── authStore.ts       # Zustand 유저 상태 관리
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

- [2026-06-24] Phase 0: Next.js 프로젝트 초기화, Supabase·Zustand 설치, GitHub 연동
- [2026-06-24] Phase 1: DB 스키마 설계 (profiles, modules, higgsfield_assets), RLS 적용
- [2026-06-24] Phase 2: 회원가입·로그인·로그아웃 구현, PKCE 이메일 인증 콜백, 대시보드
- [2026-06-24] Phase 3: 404 페이지 구현

---

## 🚀 다음에 진행해야 할 액션 플랜

- [ ] Phase 4: 미디어 모듈 활성화 + Higgsfield 영상 업로드/관리 UI
- [ ] Phase 5: 커뮤니티 모듈 (게시판, 댓글)
- [ ] Phase 6: 커머스 모듈 (상품/예약)
- [ ] 배포 환경 구성 (Vercel + 환경변수 설정)
