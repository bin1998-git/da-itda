-- 미디어 포스트
create table public.media_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  tags text[] default '{}',
  views integer default 0,
  created_at timestamptz default now()
);
alter table public.media_posts enable row level security;
create policy "누구나 미디어 조회" on public.media_posts for select using (true);
create policy "본인 미디어 관리" on public.media_posts for all using (auth.uid() = user_id);

-- 좋아요
create table public.media_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.media_posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
alter table public.media_likes enable row level security;
create policy "누구나 좋아요 조회" on public.media_likes for select using (true);
create policy "본인 좋아요 관리" on public.media_likes for all using (auth.uid() = user_id);

-- 조회수 증가 함수 (보안 우회 없이 increment)
create or replace function public.increment_views(post_id uuid)
returns void language sql security definer as $$
  update public.media_posts set views = views + 1 where id = post_id;
$$;
