-- Murate 초기 스키마
-- 실행 방법: Supabase Dashboard → SQL Editor에 붙여넣기 후 실행

-- ============ 프로필 ============
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  points int not null default 10,
  created_at timestamptz not null default now()
);

-- ============ 음악/앨범 (Spotify 데이터 캐시) ============
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique,
  title text not null,
  artist text not null,
  album_name text,
  album_id uuid,
  cover_url text,
  preview_url text,
  duration_ms int,
  release_date text,
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists tracks_title_artist_idx on tracks (lower(title), lower(artist));

create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique,
  title text not null,
  artist text not null,
  cover_url text,
  release_date text,
  total_tracks int,
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists albums_title_artist_idx on albums (lower(title), lower(artist));

alter table tracks
  add constraint tracks_album_fk foreign key (album_id) references albums(id) on delete set null;

-- 중복 방지 (spotify_id 없을 때도)
create unique index if not exists tracks_unique_manual
  on tracks (lower(title), lower(artist)) where spotify_id is null;
create unique index if not exists albums_unique_manual
  on albums (lower(title), lower(artist)) where spotify_id is null;

-- ============ 평가 ============
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('track','album')),
  target_id uuid not null,
  rating numeric(3,1) not null check (rating >= 0 and rating <= 10),
  comment text check (char_length(comment) <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
create index if not exists reviews_target_idx on reviews (target_type, target_id, created_at desc);
create index if not exists reviews_created_idx on reviews (created_at desc);

-- ============ 좋아요/싫어요 ============
create table if not exists review_reactions (
  review_id uuid not null references reviews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

-- ============ 포인트 트랜잭션 ============
create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ============ 트리거: 프로필 자동 생성 ============
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============ 트리거: 평가 작성 시 +2 포인트 ============
create or replace function on_review_created() returns trigger language plpgsql security definer as $$
begin
  update profiles set points = points + 2 where id = new.user_id;
  insert into point_transactions (user_id, delta, reason) values (new.user_id, 2, 'review_created');
  return new;
end $$;

drop trigger if exists trg_review_created on reviews;
create trigger trg_review_created after insert on reviews
  for each row execute function on_review_created();

-- ============ 리뷰 삭제 시 -3 포인트 소모 (삭제 전 검사) ============
create or replace function on_review_delete() returns trigger language plpgsql security definer as $$
declare current_points int;
begin
  select points into current_points from profiles where id = old.user_id;
  if current_points < 3 then
    raise exception 'not_enough_points';
  end if;
  update profiles set points = points - 3 where id = old.user_id;
  insert into point_transactions (user_id, delta, reason) values (old.user_id, -3, 'review_deleted');
  return old;
end $$;

drop trigger if exists trg_review_delete on reviews;
create trigger trg_review_delete before delete on reviews
  for each row execute function on_review_delete();

-- ============ 뷰: 평가 집계 ============
create or replace view track_stats as
  select target_id as track_id,
         count(*)::int as review_count,
         round(avg(rating)::numeric, 2) as avg_rating
  from reviews where target_type='track' group by target_id;

create or replace view album_stats as
  select target_id as album_id,
         count(*)::int as review_count,
         round(avg(rating)::numeric, 2) as avg_rating
  from reviews where target_type='album' group by target_id;

-- ============ Realtime 활성화 ============
alter publication supabase_realtime add table reviews;
alter publication supabase_realtime add table review_reactions;
alter publication supabase_realtime add table tracks;
alter publication supabase_realtime add table albums;

-- ============ RLS ============
alter table profiles enable row level security;
alter table tracks enable row level security;
alter table albums enable row level security;
alter table reviews enable row level security;
alter table review_reactions enable row level security;
alter table point_transactions enable row level security;

-- profiles: 누구나 읽기, 본인만 수정
create policy "profiles read" on profiles for select using (true);
create policy "profiles update own" on profiles for update using (auth.uid() = id);

-- tracks/albums: 누구나 읽기, 로그인 사용자 추가 가능
create policy "tracks read" on tracks for select using (true);
create policy "tracks insert" on tracks for insert with check (auth.uid() is not null and auth.uid() = added_by);
create policy "albums read" on albums for select using (true);
create policy "albums insert" on albums for insert with check (auth.uid() is not null and auth.uid() = added_by);

-- reviews: 누구나 읽기, 본인만 작성/삭제 (수정 불가)
create policy "reviews read" on reviews for select using (true);
create policy "reviews insert" on reviews for insert with check (auth.uid() = user_id);
create policy "reviews delete own" on reviews for delete using (auth.uid() = user_id);

-- reactions: 누구나 읽기, 로그인 사용자만 토글
create policy "reactions read" on review_reactions for select using (true);
create policy "reactions upsert" on review_reactions for insert with check (auth.uid() = user_id);
create policy "reactions update" on review_reactions for update using (auth.uid() = user_id);
create policy "reactions delete" on review_reactions for delete using (auth.uid() = user_id);

-- 포인트 내역: 본인만
create policy "points read own" on point_transactions for select using (auth.uid() = user_id);
-- 후기 삭제 비용: 3P → 5P로 변경
create or replace function on_review_delete() returns trigger language plpgsql security definer as $$
declare current_points int;
begin
  select points into current_points from profiles where id = old.user_id;
  if current_points < 5 then
    raise exception 'not_enough_points';
  end if;
  update profiles set points = points - 5 where id = old.user_id;
  insert into point_transactions (user_id, delta, reason) values (old.user_id, -5, 'review_deleted');
  return old;
end $$;
-- 리뷰 수정 시 3P 차감 + 수정 시각 기록
alter table reviews add column if not exists updated_at timestamptz;

-- RLS 업데이트 정책 (본인 리뷰만 수정 가능)
drop policy if exists "reviews update own" on reviews;
create policy "reviews update own" on reviews for update using (auth.uid() = user_id);

create or replace function on_review_update() returns trigger language plpgsql security definer as $$
declare current_points int;
begin
  -- 실질 변경 없으면 스킵
  if old.rating = new.rating and old.comment is not distinct from new.comment then
    return new;
  end if;
  select points into current_points from profiles where id = new.user_id;
  if current_points < 3 then
    raise exception 'not_enough_points';
  end if;
  update profiles set points = points - 3 where id = new.user_id;
  insert into point_transactions (user_id, delta, reason) values (new.user_id, -3, 'review_updated');
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_review_update on reviews;
create trigger trg_review_update before update on reviews
  for each row execute function on_review_update();
-- 유명 평가자 뱃지: 후기 1000개 이상 + 받은 좋아요 1000개 이상
alter table profiles add column if not exists review_count int not null default 0;
alter table profiles add column if not exists likes_received int not null default 0;

-- 백필
update profiles p set review_count = (
  select count(*) from reviews r where r.user_id = p.id
);
update profiles p set likes_received = (
  select count(*) from review_reactions rr
  join reviews r on r.id = rr.review_id
  where rr.value = 1 and r.user_id = p.id
);

-- 리뷰 카운트 트리거
create or replace function bump_review_count() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update profiles set review_count = review_count + 1 where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update profiles set review_count = greatest(review_count - 1, 0) where id = old.user_id;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_review_count on reviews;
create trigger trg_review_count after insert or delete on reviews
  for each row execute function bump_review_count();

-- 좋아요 카운트 트리거 (리뷰 작성자 기준)
create or replace function bump_likes_received() returns trigger language plpgsql security definer as $$
declare author uuid;
begin
  if tg_op = 'INSERT' then
    if new.value = 1 then
      select user_id into author from reviews where id = new.review_id;
      if author is not null then
        update profiles set likes_received = likes_received + 1 where id = author;
      end if;
    end if;
  elsif tg_op = 'DELETE' then
    if old.value = 1 then
      select user_id into author from reviews where id = old.review_id;
      if author is not null then
        update profiles set likes_received = greatest(likes_received - 1, 0) where id = author;
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    select user_id into author from reviews where id = new.review_id;
    if author is not null then
      if old.value = 1 and new.value <> 1 then
        update profiles set likes_received = greatest(likes_received - 1, 0) where id = author;
      elsif old.value <> 1 and new.value = 1 then
        update profiles set likes_received = likes_received + 1 where id = author;
      end if;
    end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_likes_received on review_reactions;
create trigger trg_likes_received after insert or update or delete on review_reactions
  for each row execute function bump_likes_received();
-- Phase 2: DB 최적화 — 인덱스 + 집계 RPC
-- 실행: Supabase SQL Editor

-- ============ 인덱스 보강 ============
create index if not exists reviews_user_created_idx
  on reviews (user_id, created_at desc);

-- review_reactions의 PK(review_id, user_id)는 review_id 프리픽스 스캔 가능하므로 별도 인덱스 불필요.

-- ============ RPC: 최근 후기 목록 (track/album) ============
-- target 마다 가장 최근 평가 시각을 집계 후, 그 순으로 tracks/albums 상세를 조인해서 반환.
create or replace function get_recently_reviewed(
  p_target text,
  p_limit int default 8
) returns table (
  id uuid,
  spotify_id text,
  title text,
  artist text,
  cover_url text,
  last_review_at timestamptz
) language sql stable as $$
  with latest as (
    select target_id, max(created_at) as last_at
    from reviews
    where target_type = p_target
    group by target_id
    order by last_at desc
    limit p_limit
  )
  select
    t.id, t.spotify_id, t.title, t.artist, t.cover_url,
    l.last_at as last_review_at
  from latest l
  join (
    select id, spotify_id, title, artist, cover_url from tracks
    where p_target = 'track'
    union all
    select id, spotify_id, title, artist, cover_url from albums
    where p_target = 'album'
  ) t on t.id = l.target_id
  order by l.last_at desc;
$$;

-- tracks 전용 (preview_url/album_id/duration 필요할 때)
create or replace function get_recently_reviewed_tracks(
  p_limit int default 8
) returns table (
  id uuid,
  spotify_id text,
  title text,
  artist text,
  album_id uuid,
  album_name text,
  cover_url text,
  preview_url text,
  duration_ms int,
  last_review_at timestamptz
) language sql stable as $$
  with latest as (
    select target_id, max(created_at) as last_at
    from reviews
    where target_type = 'track'
    group by target_id
    order by last_at desc
    limit p_limit
  )
  select
    t.id, t.spotify_id, t.title, t.artist, t.album_id, t.album_name,
    t.cover_url, t.preview_url, t.duration_ms,
    l.last_at as last_review_at
  from latest l
  join tracks t on t.id = l.target_id
  order by l.last_at desc;
$$;

-- albums 전용
create or replace function get_recently_reviewed_albums(
  p_limit int default 8
) returns table (
  id uuid,
  spotify_id text,
  title text,
  artist text,
  cover_url text,
  release_date text,
  total_tracks int,
  last_review_at timestamptz
) language sql stable as $$
  with latest as (
    select target_id, max(created_at) as last_at
    from reviews
    where target_type = 'album'
    group by target_id
    order by last_at desc
    limit p_limit
  )
  select
    a.id, a.spotify_id, a.title, a.artist, a.cover_url,
    a.release_date, a.total_tracks,
    l.last_at as last_review_at
  from latest l
  join albums a on a.id = l.target_id
  order by l.last_at desc;
$$;

-- ============ RPC: 탑 차트 ============
-- period: 'day' | 'month' | 'year'
create or replace function get_top_rated_tracks(
  p_period text,
  p_limit int default 6
) returns table (
  id uuid,
  spotify_id text,
  title text,
  artist text,
  cover_url text,
  preview_url text,
  album_id uuid,
  avg numeric,
  n int,
  first_review_at timestamptz
) language sql stable as $$
  with cutoff as (
    select case p_period
      when 'day' then now() - interval '1 day'
      when 'month' then now() - interval '1 month'
      when 'year' then now() - interval '1 year'
      else now() - interval '1 month'
    end as since
  ),
  agg as (
    select target_id,
           avg(rating)::numeric as avg_rating,
           count(*)::int as n,
           min(created_at) as first_review_at
    from reviews, cutoff
    where target_type = 'track' and created_at >= cutoff.since
    group by target_id
    order by avg_rating desc, n desc
    limit p_limit
  )
  select t.id, t.spotify_id, t.title, t.artist, t.cover_url, t.preview_url, t.album_id,
         agg.avg_rating as avg, agg.n, agg.first_review_at
  from agg join tracks t on t.id = agg.target_id
  order by agg.avg_rating desc, agg.n desc;
$$;

create or replace function get_top_rated_albums(
  p_period text,
  p_limit int default 6
) returns table (
  id uuid,
  spotify_id text,
  title text,
  artist text,
  cover_url text,
  release_date text,
  total_tracks int,
  avg numeric,
  n int,
  first_review_at timestamptz
) language sql stable as $$
  with cutoff as (
    select case p_period
      when 'day' then now() - interval '1 day'
      when 'month' then now() - interval '1 month'
      when 'year' then now() - interval '1 year'
      else now() - interval '1 month'
    end as since
  ),
  agg as (
    select target_id,
           avg(rating)::numeric as avg_rating,
           count(*)::int as n,
           min(created_at) as first_review_at
    from reviews, cutoff
    where target_type = 'album' and created_at >= cutoff.since
    group by target_id
    order by avg_rating desc, n desc
    limit p_limit
  )
  select a.id, a.spotify_id, a.title, a.artist, a.cover_url, a.release_date, a.total_tracks,
         agg.avg_rating as avg, agg.n, agg.first_review_at
  from agg join albums a on a.id = agg.target_id
  order by agg.avg_rating desc, agg.n desc;
$$;

-- ============ RPC: 리뷰 + 프로필 + 반응 집계 (한 번에) ============
-- ReviewList의 3단 왕복을 1회로 통합.
create or replace function get_reviews_with_meta(
  p_target_type text,
  p_target_id uuid,
  p_limit int default 50
) returns table (
  id uuid,
  user_id uuid,
  rating numeric,
  comment text,
  created_at timestamptz,
  display_name text,
  avatar_url text,
  review_count int,
  likes_received int,
  likes int,
  dislikes int
) language sql stable as $$
  select
    r.id, r.user_id, r.rating, r.comment, r.created_at,
    p.display_name, p.avatar_url, p.review_count, p.likes_received,
    coalesce(sum(case when rr.value =  1 then 1 else 0 end)::int, 0) as likes,
    coalesce(sum(case when rr.value = -1 then 1 else 0 end)::int, 0) as dislikes
  from reviews r
  left join profiles p on p.id = r.user_id
  left join review_reactions rr on rr.review_id = r.id
  where r.target_type = p_target_type and r.target_id = p_target_id
  group by r.id, p.id
  order by r.created_at desc
  limit p_limit;
$$;

-- ============ 권한 ============
grant execute on function get_recently_reviewed(text, int) to anon, authenticated;
grant execute on function get_recently_reviewed_tracks(int) to anon, authenticated;
grant execute on function get_recently_reviewed_albums(int) to anon, authenticated;
grant execute on function get_top_rated_tracks(text, int) to anon, authenticated;
grant execute on function get_top_rated_albums(text, int) to anon, authenticated;
grant execute on function get_reviews_with_meta(text, uuid, int) to anon, authenticated;
-- Phase: 평가 신고
create table if not exists review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason text not null check (reason in ('abuse','hate','offtopic','spam','other')),
  detail text check (char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);
create index if not exists review_reports_review_idx on review_reports (review_id);
create index if not exists review_reports_created_idx on review_reports (created_at desc);

alter table review_reports enable row level security;

-- 누구나 본인 신고만 insert, 본인 신고만 조회, 관리자 조회는 별도(뷰/서비스 키)로.
drop policy if exists "reports insert own" on review_reports;
create policy "reports insert own" on review_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports read own" on review_reports;
create policy "reports read own" on review_reports
  for select using (auth.uid() = reporter_id);
-- 닉네임 변경 횟수 + 후기 작성 24시간 내 무료 수정
-- 포인트 조정: 수정 -3P → -5P, 삭제 -3P → -10P (작성 +2P 유지)

alter table profiles
  add column if not exists nickname_changes int not null default 0;

-- ============ 닉네임 변경 RPC (첫 회 무료, 이후 500P) ============
create or replace function change_nickname(p_name text)
returns json language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  current_changes int;
  current_points int;
  cost int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if length(trim(p_name)) = 0 or length(p_name) > 24 then
    raise exception 'invalid_name';
  end if;

  select nickname_changes, points into current_changes, current_points
    from profiles where id = uid for update;

  cost := case when current_changes = 0 then 0 else 500 end;
  if current_points < cost then raise exception 'not_enough_points'; end if;

  update profiles
    set display_name = trim(p_name),
        nickname_changes = nickname_changes + 1,
        points = points - cost
    where id = uid;

  if cost > 0 then
    insert into point_transactions (user_id, delta, reason)
      values (uid, -cost, 'nickname_change');
  end if;

  return json_build_object('cost', cost, 'remaining_points', current_points - cost);
end $$;

grant execute on function change_nickname(text) to authenticated;

-- ============ 후기 삭제 포인트: -3 → -10 ============
create or replace function on_review_delete() returns trigger language plpgsql security definer as $$
declare current_points int;
begin
  select points into current_points from profiles where id = old.user_id;
  if current_points < 10 then
    raise exception 'not_enough_points';
  end if;
  update profiles set points = points - 10 where id = old.user_id;
  insert into point_transactions (user_id, delta, reason) values (old.user_id, -10, 'review_deleted');
  return old;
end $$;

-- ============ 후기 수정: 24h 내 무료, 이후 -5P ============
-- reviews 테이블에 수정 시간 추적 컬럼 추가.
alter table reviews
  add column if not exists updated_at timestamptz;

create or replace function on_review_update() returns trigger language plpgsql security definer as $$
declare
  current_points int;
  age interval;
  free_window interval := interval '24 hours';
  cost int;
begin
  -- rating/comment 이외 컬럼 변경은 제외
  if new.rating = old.rating and coalesce(new.comment,'') = coalesce(old.comment,'') then
    return new;
  end if;

  age := now() - old.created_at;
  cost := case when age <= free_window then 0 else 5 end;

  if cost > 0 then
    select points into current_points from profiles where id = old.user_id;
    if current_points < cost then raise exception 'not_enough_points'; end if;
    update profiles set points = points - cost where id = old.user_id;
    insert into point_transactions (user_id, delta, reason)
      values (old.user_id, -cost, 'review_edited');
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_review_update on reviews;
create trigger trg_review_update before update on reviews
  for each row execute function on_review_update();

-- 수정 허용 RLS (기존엔 delete만 있고 update 없었음)
drop policy if exists "reviews update own" on reviews;
create policy "reviews update own" on reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ 계정 탈퇴 RPC ============
-- auth.users cascade 로 profiles / reviews / reactions 모두 삭제됨
create or replace function delete_account() returns void language plpgsql security definer as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = uid;
end $$;

grant execute on function delete_account() to authenticated;
-- 아바타 스토리지 버킷 + RLS
-- public 버킷이라 URL 직접 접근 가능. 업로드/삭제는 본인 파일만.

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- 읽기는 누구나
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- 쓰기/수정/삭제는 본인 폴더({uid}/...) 만
drop policy if exists "avatars user insert" on storage.objects;
create policy "avatars user insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars user update" on storage.objects;
create policy "avatars user update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars user delete" on storage.objects;
create policy "avatars user delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- 관리자 플래그 + 관리자 권한 RLS
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- helper
create or replace function is_admin(u uuid)
returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from profiles where id = u), false);
$$;

grant execute on function is_admin(uuid) to authenticated;

-- 관리자는 모든 신고 조회
drop policy if exists "reports admin read" on review_reports;
create policy "reports admin read" on review_reports
  for select using (is_admin(auth.uid()));

drop policy if exists "reports admin delete" on review_reports;
create policy "reports admin delete" on review_reports
  for delete using (is_admin(auth.uid()));

-- 관리자는 어떤 후기도 삭제 가능 (신고 처리용)
drop policy if exists "reviews delete admin" on reviews;
create policy "reviews delete admin" on reviews
  for delete using (is_admin(auth.uid()));

-- 신고 목록 + 대상/신고자 메타 RPC (join 편의)
create or replace function get_reports_admin(p_limit int default 100)
returns table (
  id uuid,
  created_at timestamptz,
  reason text,
  detail text,
  review_id uuid,
  review_rating numeric,
  review_comment text,
  review_user_id uuid,
  review_target_type text,
  review_target_id uuid,
  target_title text,
  target_artist text,
  reporter_id uuid,
  reporter_name text,
  author_name text
) language plpgsql security definer as $$
begin
  if not is_admin(auth.uid()) then raise exception 'not_admin'; end if;
  return query
    select
      r.id, r.created_at, r.reason, r.detail,
      rv.id, rv.rating, rv.comment, rv.user_id, rv.target_type, rv.target_id,
      case when rv.target_type = 'track' then t.title else al.title end as target_title,
      case when rv.target_type = 'track' then t.artist else al.artist end as target_artist,
      r.reporter_id, rp.display_name, au.display_name
    from review_reports r
    left join reviews rv on rv.id = r.review_id
    left join tracks t on rv.target_type = 'track' and t.id = rv.target_id
    left join albums al on rv.target_type = 'album' and al.id = rv.target_id
    left join profiles rp on rp.id = r.reporter_id
    left join profiles au on au.id = rv.user_id
    order by r.created_at desc
    limit p_limit;
end $$;

grant execute on function get_reports_admin(int) to authenticated;

-- 관리자가 삭제할 땐 작성자 포인트 차감하지 않도록 트리거 보정
create or replace function on_review_delete() returns trigger language plpgsql security definer as $$
declare current_points int;
begin
  -- 본인이 직접 지울 때만 -10P (관리자 강제 삭제는 면제)
  if auth.uid() is distinct from old.user_id then
    return old;
  end if;
  select points into current_points from profiles where id = old.user_id;
  if current_points < 10 then
    raise exception 'not_enough_points';
  end if;
  update profiles set points = points - 10 where id = old.user_id;
  insert into point_transactions (user_id, delta, reason) values (old.user_id, -10, 'review_deleted');
  return old;
end $$;

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
