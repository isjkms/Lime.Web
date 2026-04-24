-- 팔로우 관계
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on follows (followee_id);
create index if not exists follows_follower_idx on follows (follower_id);

alter table follows enable row level security;

drop policy if exists "follows read" on follows;
create policy "follows read" on follows for select using (true);

drop policy if exists "follows insert own" on follows;
create policy "follows insert own" on follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "follows delete own" on follows;
create policy "follows delete own" on follows
  for delete using (auth.uid() = follower_id);

-- 카운트 캐시
alter table profiles
  add column if not exists followers_count int not null default 0,
  add column if not exists following_count int not null default 0;

-- 초기 백필
update profiles p set followers_count = (
  select count(*) from follows f where f.followee_id = p.id
);
update profiles p set following_count = (
  select count(*) from follows f where f.follower_id = p.id
);

create or replace function bump_follow_counts() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update profiles set followers_count = followers_count + 1 where id = new.followee_id;
    update profiles set following_count = following_count + 1 where id = new.follower_id;
    return new;
  elsif tg_op = 'DELETE' then
    update profiles set followers_count = greatest(followers_count - 1, 0) where id = old.followee_id;
    update profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists trg_follow_counts on follows;
create trigger trg_follow_counts after insert or delete on follows
  for each row execute function bump_follow_counts();
