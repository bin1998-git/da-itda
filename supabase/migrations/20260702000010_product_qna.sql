-- 상품 Q&A 테이블
create table public.product_qna (
  id           uuid default gen_random_uuid() primary key,
  product_id   uuid references public.products(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  seller_id    uuid references public.profiles(id) on delete set null,
  question     text not null,
  answer       text,
  answered_at  timestamptz,
  created_at   timestamptz default now()
);

alter table public.product_qna enable row level security;

create policy "누구나 조회"
  on public.product_qna for select using (true);

create policy "로그인 유저 질문 등록 (자기 상품 제외)"
  on public.product_qna for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid()
    )
  );

create policy "판매자만 답변 등록"
  on public.product_qna for update
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid()
    )
  );
