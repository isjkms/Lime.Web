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
