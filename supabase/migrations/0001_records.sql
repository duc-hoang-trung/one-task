-- Một Việc · bảng đồng bộ duy nhất. Mỗi dòng = một bản ghi Dexie (jsonb), thuộc về đúng 1 user.
create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  table_name text        not null,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null,
  deleted    boolean     not null default false,
  primary key (user_id, table_name, id)
);

create index if not exists records_user_updated_idx on public.records (user_id, updated_at);

alter table public.records enable row level security;

drop policy if exists "own rows" on public.records;
create policy "own rows" on public.records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
