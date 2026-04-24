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

