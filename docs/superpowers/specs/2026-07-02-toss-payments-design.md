# 토스페이먼츠 v2 결제 연동 (Phase 21) 설계

**날짜:** 2026-07-02
**Phase:** 21

---

## Goal

장바구니에서 `orders`를 바로 `status: 'paid'`로 INSERT하던 가짜 결제를, 토스페이먼츠 결제창(API 개별연동)을 통한 실제 카드 결제 승인으로 교체한다. 결제 성공 시에만 재고를 차감하고, 판매자가 대시보드에서 부분/전체 환불을 처리할 수 있게 한다.

## 연동 방식

**결제창(Payment Window) / API 개별연동** 방식을 사용한다. 결제위젯(카카오페이 등 여러 간편결제를 한 화면에 통합)은 "전자결제 신청"(사업자등록 필요)을 거쳐야 키가 나오는 반면, API 개별연동 키는 사업자등록 없이 회원가입만으로 테스트 키가 즉시 발급된다. 카드 결제 하나만 붙이는 목적에는 기능 차이가 없고, 나중에 사업자등록 후 결제위젯으로 업그레이드하기도 쉽다.

- `NEXT_PUBLIC_TOSS_CLIENT_KEY` — 프론트엔드 결제창 호출용 (공개 가능)
- `TOSS_SECRET_KEY` — 서버 전용, 결제 승인/취소 API 호출용 (절대 클라이언트 노출 금지)
- API 버전: `2024-06-01`

## 결제 플로우

```
장바구니 "결제하기" 클릭
  → 서버: orders 생성 (status: 'pending', 배송정보/쿠폰할인 반영된 최종 금액 확정)
  → 브라우저: 토스 결제창 SDK 호출 (orderId, amount, successUrl, failUrl 전달)
  → 카드 승인 → 토스가 successUrl로 리다이렉트 (paymentKey, orderId, amount 쿼리파라미터)
  → 서버 (/payments/success): DB에서 orderId로 주문 재확인(금액 일치 검증) → /v1/payments/confirm 호출
      성공 시:
        - orders.status → 'paid', payment_key/paid_at 기록
        - 재고 차감 (원자적 조건부 UPDATE, 아래 "동시성" 참고)
        - 재고 부족 시: 즉시 결제 취소 API 호출 후 orders.status → 'failed', fail_reason 기록
        - 크리에이터 커미션 트리거(trigger_creator_commission)는 orders INSERT가 아니라 UPDATE로 status가 'paid'가 되는 시점에 발동하도록 트리거 조건 수정 필요
      실패 시: orders.status → 'failed', fail_reason 기록, 재고 안 건드림
  → 결제 취소/실패 시 토스가 failUrl로 리다이렉트 → 재시도 안내 화면
```

## DB 변경

`supabase/migrations/`에 새 마이그레이션 추가:

```sql
alter table public.orders
  add column if not exists payment_key text,
  add column if not exists paid_at timestamptz,
  add column if not exists fail_reason text,
  add column if not exists refunded_amount integer not null default 0;
```

`orders.status` 값 확장: 기존(`paid`, `preparing`, `shipping`, `delivered`, `cancelled`)에 `pending`, `failed` 추가. 체크 제약 없이 자유 text이므로 스키마 변경 없이 코드에서만 새 값 사용.

**기존 `trigger_creator_commission` 트리거 재검토 필요**: 현재는 `orders` INSERT 시 발동하도록 되어 있는데(주문 생성 = 결제 완료였으므로), 이제는 주문이 `pending`으로 먼저 생성되고 나중에 `paid`로 UPDATE되므로, 트리거를 INSERT에서 "UPDATE OF status WHEN status='paid'"로 옮겨야 한다. 이 부분은 구현 계획에서 기존 트리거 SQL을 확인 후 정확히 마이그레이션한다.

## 재고 차감 (결제 승인 후, 원자적)

```sql
update products set stock = stock - :qty
where id = :product_id and stock >= :qty
returning id;
```
행이 반환되지 않으면(재고 부족) 해당 주문 전체를 즉시 토스 취소 API로 환불하고 `status: 'failed'`, `fail_reason: '재고 부족으로 자동 환불'`로 기록. 이미 차감된 다른 상품의 재고는 함께 롤백(트랜잭션).

## 부분/전체 환불

- 대시보드 "판매 정산" 탭의 주문 카드에 "환불" 버튼 추가 (판매자 전용). `status`가 `paid`/`preparing`/`shipping`/`delivered`인 주문에만 노출 (`pending`은 아직 결제 전, `failed`/`cancelled`는 이미 종결 상태이므로 제외)
- 모달: 환불 금액 입력(기본값 = 결제액 - 이미 환불된 금액, 그 이상 입력 불가), 사유 텍스트
- 서버 라우트(`/api/payments/cancel`)에서 토스 부분취소 API(`POST /v1/payments/{paymentKey}/cancel`, `cancelAmount` 지정) 호출
- 성공 시 `orders.refunded_amount` 누적. **부분환불**(환불액 < 결제 총액)이면 기존 `status`(preparing/shipping/delivered 등) 그대로 유지. **전액환불**(환불액 == 결제 총액)이면 `status → 'cancelled'`로 전환
- 환불된 수량만큼 해당 상품 재고 원복
- 구매자에게 `notifications` insert (환불 완료 알림)

## 컴포넌트/파일 구조

- **Create** `src/lib/toss.ts` — 서버 전용, 시크릿 키로 confirm/cancel API 호출하는 유틸 함수 (Basic 인증 헤더 생성 포함)
- **Create** `src/app/payments/success/page.tsx` — successUrl 콜백. 서버 컴포넌트에서 쿼리파라미터로 confirm 처리, 결과에 따라 성공/실패 UI
- **Create** `src/app/payments/fail/page.tsx` — 결제 실패/취소 안내 + "다시 시도" 링크
- **Create** `src/app/api/payments/cancel/route.ts` — 판매자 환불 트리거용 Route Handler (시크릿 키 사용, 반드시 서버사이드)
- **Modify** `src/app/cart/page.tsx` — `handlePurchase`를 "주문(pending) 생성 → 토스 결제창 호출"로 변경, 기존 즉시-'paid' INSERT 로직 제거
- **Modify** `src/app/dashboard/page.tsx` — seller 탭 주문 카드에 환불 버튼/모달 추가
- **Create** `supabase/migrations/20260702000020_toss_payments.sql` — 위 DB 변경 + 트리거 재정의

## 에러/동시성 처리

- **재고 부족 레이스**: 원자적 조건부 UPDATE로 처리, 실패 시 이미 승인된 결제를 즉시 자동 취소 (돈만 받고 물건 없는 상황 방지)
- **시크릿 키**: 서버 라우트/유틸에서만 사용, 클라이언트 번들에 절대 포함 금지 (`NEXT_PUBLIC_` 접두사 쓰지 않음)
- **금액 위변조 방지**: successUrl 콜백에서 토스가 보낸 `amount`를 그대로 믿지 않고, DB에 저장된 `orders.total_amount - discount_amount`와 반드시 비교 후 불일치 시 승인 거부
- **PostgREST 임베드 함정 재발 방지**: 이번 작업에서 새로 추가하는 쿼리가 `profiles`를 조인해야 하면, 구현 전 반드시 해당 테이블의 FK가 실제로 `public.profiles`를 가리키는지(`auth.users`가 아닌지) 확인. 아니면 오늘처럼 별도 조회 후 병합하는 기존 관례(`admin/inquiries` 패턴)를 따른다.
- **검증**: 이 레포에 자동 테스트 러너가 없으므로 `npm run build`(타입체크)와 토스 공식 테스트카드로 브라우저에서 결제 전체 플로우를 실제로 실행해 확인한다 (오늘 Q&A 기능 검증과 동일한 방식).

## 범위 밖 (이번 Phase에서 안 함)

- 가상계좌/계좌이체 등 카드 외 결제수단 (나중에 결제위젯으로 업그레이드 시 함께 고려)
- 구매자 셀프 환불 요청 (환불은 판매자/관리자만 트리거)
- 정기결제/빌링
