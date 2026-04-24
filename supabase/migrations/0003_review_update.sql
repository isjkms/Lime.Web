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
