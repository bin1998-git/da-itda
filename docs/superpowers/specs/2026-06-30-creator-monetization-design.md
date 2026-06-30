# 크리에이터 수익화 시스템 설계 문서

**날짜:** 2026-06-30  
**Feature:** 미디어 영상 상품 태그 + 크리에이터 캐시 수익

---

## 목표

레시피 영상에 마켓 상품을 태그하고, 해당 영상을 통해 구매가 발생하면 크리에이터에게 5%의 플랫폼 캐시를 자동 지급한다. 크리에이터는 적립된 캐시를 마켓 구매에 사용하거나 출금 신청할 수 있다.

---

## 전체 흐름

```
[크리에이터] 영상 업로드 시 마켓 상품 태그 (최대 5개)
      ↓
[시청자] 영상 상세페이지 → "이 레시피 재료" 섹션 → "장바구니 담기"
      ↓
localStorage에 referral_media_id 저장
      ↓
[시청자] 결제 → orders 생성 시 referral_media_id 포함
      ↓
[DB 트리거] orders INSERT → creator_earnings 기록 + profiles.creator_cash += 5%
      ↓
[크리에이터] /creator 대시보드에서 수익 확인 + 출금 신청
```

---

## DB 변경사항

### 1. 신규 테이블: `media_product_tags`

```sql
create table public.media_product_tags (
  id uuid default gen_random_uuid() primary key,
  media_post_id uuid references public.media_posts(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(media_post_id, product_id)
);
alter table public.media_product_tags enable row level security;
create policy "누구나 태그 조회" on public.media_product_tags for select using (true);
create policy "미디어 작성자만 태그 관리" on public.media_product_tags
  for all using (
    exists (
      select 1 from public.media_posts
      where id = media_post_id and user_id = auth.uid()
    )
  );
```

### 2. 신규 테이블: `creator_earnings`

```sql
create table public.creator_earnings (
  id uuid default gen_random_uuid() primary key,
  creator_user_id uuid references public.profiles(id) on delete cascade not null,
  media_post_id uuid references public.media_posts(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  amount integer not null,
  created_at timestamptz default now()
);
alter table public.creator_earnings enable row level security;
create policy "본인 수익만 조회" on public.creator_earnings
  for select using (auth.uid() = creator_user_id);
```

### 3. 신규 테이블: `cash_withdrawals`

```sql
create table public.cash_withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  status text not null default 'pending', -- pending | approved | rejected
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  created_at timestamptz default now(),
  processed_at timestamptz
);
alter table public.cash_withdrawals enable row level security;
create policy "본인 출금 조회" on public.cash_withdrawals
  for select using (auth.uid() = user_id);
create policy "본인 출금 신청" on public.cash_withdrawals
  for insert with check (auth.uid() = user_id);
```

### 4. 기존 테이블 컬럼 추가

```sql
-- orders: 레퍼럴 영상 추적
alter table public.orders
  add column referral_media_id uuid references public.media_posts(id) on delete set null;

-- profiles: 크리에이터 캐시 잔액
alter table public.profiles
  add column creator_cash integer not null default 0;
```

### 5. DB 트리거 (커미션 자동 적립)

```sql
create or replace function public.credit_creator_commission()
returns trigger language plpgsql security definer as $$
declare
  v_creator_id uuid;
  v_commission  integer;
begin
  if new.referral_media_id is null then
    return new;
  end if;

  select user_id into v_creator_id
  from public.media_posts
  where id = new.referral_media_id;

  if v_creator_id is null or v_creator_id = new.user_id then
    return new;
  end if;

  v_commission := floor(new.total_amount * 0.05);

  if v_commission > 0 then
    insert into public.creator_earnings
      (creator_user_id, media_post_id, order_id, amount)
    values
      (v_creator_id, new.referral_media_id, new.id, v_commission);

    update public.profiles
    set creator_cash = creator_cash + v_commission
    where id = v_creator_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_creator_commission on public.orders;
create trigger trigger_creator_commission
  after insert on public.orders
  for each row execute function public.credit_creator_commission();
```

---

## 프론트엔드 변경사항

### 신규 컴포넌트

| 파일 | 역할 |
|------|------|
| `src/components/ui/ProductTagSelector.tsx` | 업로드 페이지에서 상품 검색·선택 UI |
| `src/components/ui/MediaProductSection.tsx` | 영상 상세 페이지 "이 레시피 재료" 섹션 |

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/media/upload/page.tsx` | `ProductTagSelector` 추가, 저장 시 `media_product_tags` insert |
| `src/app/media/[id]/page.tsx` | `MediaProductSection` 추가, referral localStorage 저장 |
| `src/app/cart/page.tsx` | localStorage에서 `referral_media_id` 읽어 orders INSERT에 포함 |
| `src/types/media.ts` | `MediaPost`에 `tagged_products` 필드 추가 |

### 신규 페이지

| 경로 | 내용 |
|------|------|
| `src/app/creator/page.tsx` | 크리에이터 대시보드: 누적 캐시, 영상별 판매 현황, 출금 신청 |

---

## 수익 구조 상세

- **커미션율:** 주문 total_amount의 5% (상수 `CREATOR_COMMISSION_RATE = 0.05`)
- **적립 시점:** 주문 생성(INSERT) 즉시 — 환불/취소 시 수동 회수 (초기 MVP)
- **자기 자신 제외:** creator가 본인 영상 referral로 구매 시 적립 안 함
- **최소 출금액:** 5,000원
- **출금 승인:** 어드민 수동 처리 (`cash_withdrawals.status = 'approved'` 변경 시 실제 이체)
- **캐시 사용:** checkout 페이지에서 creator_cash를 할인에 적용 가능 (Phase 2)

---

## Referral 추적 방식

1. `MediaProductSection`의 "장바구니 담기" 클릭 시:
   ```ts
   localStorage.setItem('referral_media_id', mediaPostId);
   ```
2. `src/app/cart/page.tsx` 주문 생성(`orders` INSERT) 시:
   ```ts
   const referralMediaId = localStorage.getItem('referral_media_id');
   // orders INSERT payload에 referral_media_id: referralMediaId ?? null 포함
   localStorage.removeItem('referral_media_id'); // 주문 완료 후 제거
   ```

---

## 크리에이터 대시보드 (`/creator`)

- 총 누적 캐시 잔액
- 이번 달 수익 (creator_earnings WHERE created_at >= 이번 달 1일)
- 영상별 판매 건수 / 총 수익 (creator_earnings GROUP BY media_post_id)
- 출금 신청 폼 (은행명, 계좌번호, 예금주, 금액)
- 출금 신청 내역 (cash_withdrawals)

---

## 제약 및 엣지 케이스

- 영상 당 상품 태그 최대 **5개**
- 같은 영상에 같은 상품 중복 태그 불가 (`unique` 제약)
- 영상 삭제 시 `media_product_tags` CASCADE 삭제
- 상품 삭제 시 `media_product_tags` CASCADE 삭제
- 출금 신청 시 현재 creator_cash >= 신청 금액 검증 (클라이언트 + DB CHECK)
- 크리에이터 = 구매자인 자기 레퍼럴 커미션 방지 (트리거에서 처리)
