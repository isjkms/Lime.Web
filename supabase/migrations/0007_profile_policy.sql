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
