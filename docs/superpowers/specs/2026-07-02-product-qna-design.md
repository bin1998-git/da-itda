# 상품 Q&A 시스템 설계

**날짜:** 2026-07-02  
**Phase:** 20

---

## Goal

상품 상세 페이지에 구매자가 판매자에게 질문하고 판매자가 답변하는 Q&A 탭 추가.

---

## DB 스키마

```sql
create table public.product_qna (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  seller_id uuid references public.profiles(id) on delete set null,
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz default now()
);
```

RLS:
- 전체 조회 허용 (누구나)
- 로그인 유저만 질문 insert (자기 상품 제외)
- 판매자만 answer 컬럼 update

---

## 컴포넌트

### ProductQnaSection (클라이언트)
- Props: `productId: string`, `sellerId: string`, `initialQnas: Qna[]`
- Q&A 목록 렌더링 (질문 + 답변, 미답변 시 "답변 대기 중" 표시)
- 로그인 유저 대상 질문 작성 폼 (자기 상품은 폼 숨김)

### 상품 상세 페이지 (`market/[id]/page.tsx`)
- Promise.all에 `product_qna` 조회 추가
- 기존 탭 배열에 `{ id: 'qna', label: 'Q&A', count: N }` 추가
- children에 `<ProductQnaSection />` 추가

### 판매자 대시보드 (`dashboard/page.tsx`)
- seller 탭에 Q&A 섹션 추가
- 미답변 질문 목록 → 인라인 답변 입력 → 저장
- 답변 저장 시 질문자에게 notification 발송

---

## 알림

기존 notifications 시스템 활용:
```ts
{ type: 'qna_answered', title: '판매자가 답변을 남겼습니다', body: question, link: `/market/${productId}` }
```

---

## 제약

- 자기 상품에는 질문 불가
- 비로그인 상태에서 폼 숨김 (로그인 유도 버튼 표시)
- 질문 최소 10자
