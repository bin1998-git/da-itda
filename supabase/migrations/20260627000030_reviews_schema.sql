create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  rating      int  not null check (rating between 1 and 5),
  content     text,
  created_at  timestamptz default now(),
  unique (product_id, user_id)
);

alter table public.reviews enable row level security;

create policy "anyone can read reviews"
  on public.reviews for select using (true);

create policy "auth users can insert own review"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "users can update own review"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "users can delete own review"
  on public.reviews for delete
  using (auth.uid() = user_id);
