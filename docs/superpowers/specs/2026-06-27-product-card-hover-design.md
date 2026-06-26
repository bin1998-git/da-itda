# 상품 카드 호버 효과 설계

Date: 2026-06-27

## 목표

마켓 상품 카드에 마우스 오버 시 마켓컬리/무신사 스타일의 슬라이드업 오버레이를 표시해 장바구니 담기 / 찜하기를 카드에서 바로 실행할 수 있게 한다.

---

## 컴포넌트 변경

### 신규: `src/components/ui/ProductCard.tsx` (Client Component)

현재 `market/page.tsx` 내부의 `ProductCard` Server Component를 독립 Client Component로 분리.

**이유:** 호버 오버레이 버튼이 장바구니/찜 Supabase 쿼리를 실행해야 하므로 Client Component 필수.

### 수정: `src/app/market/page.tsx`

`ProductCard` 정의 삭제 → `@/components/ui/ProductCard` import로 교체.

---

## 호버 효과 상세

### 이미지 영역

```
┌──────────────────────────────────┐
│  [이미지]                         │  ← scale(1.05) on hover, overflow hidden
│                                  │
│                                  │
│  ┌──────────────────────────────┐│  ← 하단 오버레이 (평소: translateY(100%), hover: translateY(0))
│  │  [장바구니 담기]  [♡]         ││  ← amber 버튼 + 하트 버튼
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

- **이미지 scale:** `group-hover:scale-105 transition-transform duration-300`
- **오버레이:** `absolute bottom-0 left-0 right-0` — `translate-y-full group-hover:translate-y-0 transition-transform duration-300`
- **배경:** `bg-gradient-to-t from-black/70 via-black/40 to-transparent` (이미지 위 자연스럽게 얹힘)
- **찜하기 버튼:** 이미지 우상단 `absolute top-2 right-2` — 평소 opacity-0, hover 시 opacity-100

### 버튼 동작

**장바구니 담기:**
- `quantity: 1` 즉시 upsert (수량 스텝퍼 없음 — 세부 조정은 상품 상세 페이지)
- 성공 시 버튼 텍스트 "✓ 담겼어요" 1.5초 후 복원
- 미로그인 시 `/auth/login` 리다이렉트
- 품절(`stock === 0`) 시 버튼 "품절" 비활성화

**찜하기:**
- 현재 `WishlistButton` 로직 그대로 — 로그인 여부 확인, toggle
- alert() 제거 → 미로그인 시 조용히 `/auth/login` 리다이렉트 (alert은 브라우저 차단 위험)

### 모바일 대응

터치 디바이스는 hover 없음 → 오버레이를 항상 표시 (`@media (hover: none)` 또는 Tailwind `group` 없이 항상 visible).
Tailwind로: 오버레이에 `translate-y-full group-hover:translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0` 대신 모바일에서는 `translate-y-0` 유지.

실용적 구현: `translate-y-full group-hover:translate-y-0` + 모바일에서는 항상 표시하는 별도 클래스 조합 사용.

---

## 파일 변경 목록

| 파일 | 변경 |
|---|---|
| `src/components/ui/ProductCard.tsx` | 신규 생성 |
| `src/app/market/page.tsx` | ProductCard 정의 삭제, import 추가 |

---

## 비기능 요건

- 기존 상품 상세 이동 링크 동작 유지 (버튼 클릭은 e.stopPropagation)
- 다크/라이트 모드 완전 대응
- transition 300ms — 너무 빠르거나 느리지 않게
