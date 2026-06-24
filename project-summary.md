# 다잇다 (Da-itda) 프로젝트 요약

## 시스템 가동 기록

### [2026-06-24] Phase 0 — 초기화 완료

**스택:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Zustand

**생성 파일:**
- `src/lib/supabase.ts` — Supabase 클라이언트 싱글톤 초기화
- `src/app/page.tsx` — Higgsfield Hero 섹션 포함 메인 레이아웃
- `src/components/ui/HiggsfieldHero.tsx` — 힉스필드 영상 Hero 모듈 (재사용 가능)

**아키텍처 결정:**
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (.env.local 필요)
- Higgsfield Hero는 독립 컴포넌트로 분리 → 모든 페이지에서 재사용

---

## 🚀 다음 액션 플랜

1. `.env.local` 생성 후 Supabase URL/키 직접 입력
2. Supabase 테이블 스키마 설계 (Phase 1)
3. 인증(Auth) 플로우 구현 (Phase 2)
