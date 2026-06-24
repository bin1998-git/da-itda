-- 게시글
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text not null default 'general',
  views integer default 0,
  created_at timestamptz default now()
);
alter table public.posts enable row level security;
create policy "누구나 게시글 조회" on public.posts for select using (true);
create policy "본인 게시글 관리" on public.posts for all using (auth.uid() = user_id);

-- 게시글 좋아요
create table public.post_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
alter table public.post_likes enable row level security;
create policy "누구나 좋아요 조회" on public.post_likes for select using (true);
create policy "본인 좋아요 관리" on public.post_likes for all using (auth.uid() = user_id);

-- 댓글
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);
alter table public.comments enable row level security;
create policy "누구나 댓글 조회" on public.comments for select using (true);
create policy "본인 댓글 관리" on public.comments for all using (auth.uid() = user_id);

-- 조회수 증가 함수
create or replace function public.increment_post_views(post_id uuid)
returns void language sql security definer as $$
  update public.posts set views = views + 1 where id = post_id;
$$;
