-- Một Việc · Web Push. Chạy sau 0001_records.sql.
-- Thiết kế để KHÔNG tốn hạn mức: cron mỗi phút chỉ chạy một câu SQL trong Postgres;
-- chỉ khi thật sự có người tới giờ mới gọi Edge Function, và gọi MỘT lần cho tất cả.

-- 1. Subscription của từng thiết bị. tz là múi giờ IANA của máy đó, để so giờ địa phương
--    ngay trong SQL — Postgres tự lo DST, không phải tính sẵn giờ UTC rồi cache.
create table if not exists public.push_subscriptions (
  endpoint   text        primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  p256dh     text        not null,
  auth       text        not null,
  tz         text        not null default 'UTC',
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "own subs" on public.push_subscriptions;
create policy "own subs" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Index cho câu truy vấn "đến giờ" chạy mỗi phút. Partial nên rất nhỏ.
create index if not exists records_mission_at_idx
  on public.records ((data ->> 'at')) where table_name = 'missions' and deleted = false;
create index if not exists records_task_start_idx
  on public.records ((data ->> 'startAt')) where table_name = 'tasks' and deleted = false;

-- 3. Ai đang tới giờ, ngay phút này, theo giờ địa phương của từng thiết bị.
create or replace function public.due_reminders()
returns table (endpoint text, p256dh text, auth text, title text, body text, tag text)
language sql stable as $$
  with sub as (
    select s.endpoint, s.p256dh, s.auth, s.user_id,
           to_char(now() at time zone s.tz, 'HH24:MI')    as hm,
           to_char(now() at time zone s.tz, 'YYYY-MM-DD') as day
    from public.push_subscriptions s
  )
  -- nhiệm vụ hằng ngày có giờ cố định, còn hiệu lực, hôm nay chưa tick
  select sub.endpoint, sub.p256dh, sub.auth,
         m.data ->> 'title', m.data ->> 'note', 'mission-' || m.id
  from sub
  join public.records m
    on m.user_id = sub.user_id and m.table_name = 'missions' and m.deleted = false
  where coalesce((m.data ->> 'active')::boolean, true)
    and m.data ->> 'at' = sub.hm
    and not exists (
      select 1 from public.records l
      where l.user_id = sub.user_id and l.table_name = 'missionLogs' and l.deleted = false
        and l.id = sub.day || ':' || m.id
        and (l.data ->> 'done')::boolean
    )
  union all
  -- việc của hôm nay có giờ bắt đầu, chưa xong
  select sub.endpoint, sub.p256dh, sub.auth,
         t.data ->> 'title', t.data ->> 'nextAction', 'start-' || t.id
  from sub
  join public.records t
    on t.user_id = sub.user_id and t.table_name = 'tasks' and t.deleted = false
  where t.data ->> 'startAt' = sub.hm
    and t.data ->> 'scheduledFor' = sub.day
    and t.data ->> 'status' in ('planned', 'active');
$$;

-- 4. Cron gọi hàm này mỗi phút. Không có ai tới giờ → return 0, KHÔNG gọi ra ngoài.
create or replace function public.push_due(fn_url text, shared_secret text)
returns int language plpgsql security definer set search_path = public as $$
declare items jsonb; n int;
begin
  select jsonb_agg(to_jsonb(d)), count(*) into items, n from public.due_reminders() d;
  if coalesce(n, 0) = 0 then return 0; end if;
  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', shared_secret),
    body    := jsonb_build_object('items', items)
  );
  return n;
end $$;
