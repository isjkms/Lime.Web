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
