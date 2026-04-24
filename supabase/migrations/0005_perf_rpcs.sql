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
