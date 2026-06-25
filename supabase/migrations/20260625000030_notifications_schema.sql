-- 알림 테이블
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- 'like_post', 'like_media', 'comment', 'order'
  title text not null,
  body text,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "본인 알림 조회" on public.notifications for select using (auth.uid() = user_id);
create policy "알림 생성" on public.notifications for insert with check (true);
create policy "알림 수정" on public.notifications for update using (auth.uid() = user_id);
create policy "알림 삭제" on public.notifications for delete using (auth.uid() = user_id);
