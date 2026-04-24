-- 알림
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade, -- 수신자
  actor_id uuid references profiles(id) on delete set null,
  type text not null check (type in ('review_like','follow')),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

drop policy if exists "notif read own" on notifications;
create policy "notif read own" on notifications for select using (auth.uid() = user_id);

drop policy if exists "notif update own" on notifications;
create policy "notif update own" on notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notif delete own" on notifications;
create policy "notif delete own" on notifications for delete using (auth.uid() = user_id);

-- Realtime 구독 활성화
alter publication supabase_realtime add table notifications;

-- ============ 후기 좋아요 → 알림 ============
create or replace function notify_review_like() returns trigger language plpgsql security definer as $$
declare
  author uuid;
  rv record;
begin
  if tg_op = 'INSERT' and new.value = 1 then
    select user_id, target_type, target_id into rv from reviews where id = new.review_id;
    author := rv.user_id;
    if author is null or author = new.user_id then return new; end if;
    insert into notifications (user_id, actor_id, type, data)
      values (author, new.user_id, 'review_like',
        jsonb_build_object('review_id', new.review_id, 'target_type', rv.target_type, 'target_id', rv.target_id));
  elsif tg_op = 'UPDATE' and old.value <> 1 and new.value = 1 then
    select user_id, target_type, target_id into rv from reviews where id = new.review_id;
    author := rv.user_id;
    if author is null or author = new.user_id then return new; end if;
    insert into notifications (user_id, actor_id, type, data)
      values (author, new.user_id, 'review_like',
        jsonb_build_object('review_id', new.review_id, 'target_type', rv.target_type, 'target_id', rv.target_id));
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_review_like on review_reactions;
create trigger trg_notify_review_like after insert or update on review_reactions
  for each row execute function notify_review_like();

-- ============ 팔로우 → 알림 ============
create or replace function notify_follow() returns trigger language plpgsql security definer as $$
begin
  insert into notifications (user_id, actor_id, type, data)
    values (new.followee_id, new.follower_id, 'follow', '{}'::jsonb);
  return new;
end $$;

drop trigger if exists trg_notify_follow on follows;
create trigger trg_notify_follow after insert on follows
  for each row execute function notify_follow();

-- ============ 메타 포함 목록 RPC ============
create or replace function get_notifications(p_limit int default 30)
returns table (
  id uuid,
  type text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz,
  actor_id uuid,
  actor_name text,
  actor_avatar text
) language plpgsql security definer as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  return query
    select n.id, n.type, n.data, n.read_at, n.created_at,
           n.actor_id, p.display_name, p.avatar_url
    from notifications n
    left join profiles p on p.id = n.actor_id
    where n.user_id = uid
    order by n.created_at desc
    limit p_limit;
end $$;

grant execute on function get_notifications(int) to authenticated;

-- 전체 읽음 처리
create or replace function mark_notifications_read() returns void language plpgsql security definer as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  update notifications set read_at = now() where user_id = uid and read_at is null;
end $$;

grant execute on function mark_notifications_read() to authenticated;
