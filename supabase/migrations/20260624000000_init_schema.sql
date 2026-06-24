create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "본인만 조회/수정" on public.profiles
  using (auth.uid() = id);

create table public.modules (
  id serial primary key,
  slug text unique not null,
  label text not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

insert into public.modules (slug, label, is_active) values
  ('commerce', '커머스', false),
  ('media',    '미디어', false),
  ('community','커뮤니티', false);

create table public.higgsfield_assets (
  id uuid default gen_random_uuid() primary key,
  module_slug text references public.modules(slug),
  video_url text not null,
  title text,
  is_hero boolean default false,
  created_at timestamptz default now()
);
alter table public.higgsfield_assets enable row level security;
create policy "전체 공개 읽기" on public.higgsfield_assets
  for select using (true);
