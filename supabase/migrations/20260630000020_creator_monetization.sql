-- 1. 영상-상품 태그 연결 테이블
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

-- 2. 크리에이터 수익 내역 테이블
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

-- 3. 출금 신청 테이블
create table public.cash_withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  status text not null default 'pending',
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  created_at timestamptz default now(),
  processed_at timestamptz,
  constraint cash_withdrawals_status_check check (status in ('pending','approved','rejected')),
  constraint cash_withdrawals_amount_check check (amount >= 5000)
);
alter table public.cash_withdrawals enable row level security;
create policy "본인 출금 조회" on public.cash_withdrawals
  for select using (auth.uid() = user_id);
create policy "본인 출금 신청" on public.cash_withdrawals
  for insert with check (auth.uid() = user_id);

-- 4. orders 테이블에 referral 컬럼 추가
alter table public.orders
  add column if not exists referral_media_id uuid references public.media_posts(id) on delete set null;

-- 5. profiles 테이블에 creator_cash 컬럼 추가
alter table public.profiles
  add column if not exists creator_cash integer not null default 0;

-- 6. 커미션 자동 적립 트리거 함수
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

  -- 자기 자신 레퍼럴 제외
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
