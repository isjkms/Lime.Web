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
