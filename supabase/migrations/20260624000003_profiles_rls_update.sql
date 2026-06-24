-- UPDATE 정책 추가
create policy "본인만 수정" on public.profiles
  for update using (auth.uid() = id);

-- INSERT 정책 추가 (트리거 외 직접 삽입 대비)
create policy "본인만 삽입" on public.profiles
  for insert with check (auth.uid() = id);
