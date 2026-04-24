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
