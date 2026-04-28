import { cookies } from "next/headers";
import TopChartTabs from "@/components/TopChartTabs";
import FamousFeed from "@/components/FamousFeed";
import RecentReviewSidebar from "@/components/RecentReviewSidebar";
import { getCurrentUser } from "@/lib/auth";
import {
  getTopRated,
  getFamousRecentReviews,
  getFollowingFeed,
  getRecentlyReviewedMixed,
} from "@/lib/queries";

export const revalidate = 0;

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const viewer = await getCurrentUser();

  const [
    recentMixed,
    tDay, tMonth, tYear,
    aDay, aMonth, aYear,
    famous,
    followingFeed,
  ] = await Promise.all([
    getRecentlyReviewedMixed(10),
    getTopRated("track", "day", 5),
    getTopRated("track", "month", 5),
    getTopRated("track", "year", 5),
    getTopRated("album", "day", 5),
    getTopRated("album", "month", 5),
    getTopRated("album", "year", 5),
    getFamousRecentReviews(6),
    viewer ? getFollowingFeed(cookieHeader, 8) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {/* Hero — 컴팩트하게 */}
      <section className="relative overflow-hidden rounded-2xl border border-border px-5 py-5 md:py-6"
        style={{ background: "linear-gradient(135deg, rgb(190 242 100 / 0.10) 0%, rgb(250 204 21 / 0.08) 100%)" }}>
        <div className="relative z-10 max-w-2xl">
          <div className="chip mb-2">♪ 10점 만점 · 100자 한 줄 리뷰</div>
          <h1 className="text-xl md:text-3xl font-bold leading-tight">
            <span className="gradient-text">한 줄</span>로 남기는 오늘의 감상
          </h1>
        </div>
        <div aria-hidden className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgb(190 242 100 / 0.25), transparent)" }} />
        <div aria-hidden className="absolute -left-20 -top-20 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgb(250 204 21 / 0.20), transparent)" }} />
      </section>

      {/* 본문 2-column: 좌측 메인, 우측 320px 사이드바 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-8 min-w-0">
          <TopChartTabs
            tracks={{ day: tDay, month: tMonth, year: tYear }}
            albums={{ day: aDay, month: aMonth, year: aYear }}
          />

          {viewer && (
            <section>
              <h2 className="text-lg md:text-xl font-semibold mb-3">👥 팔로우한 사용자의 최신 후기</h2>
              <FamousFeed
                items={followingFeed as any}
                showFamousBadge={false}
                emptyText="아직 팔로우한 사용자의 후기가 없어요. 리더보드에서 좋은 평가자를 찾아보세요."
              />
            </section>
          )}

          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">★ 유명 평가자의 최근 후기</h2>
            <FamousFeed items={famous as any} />
          </section>
        </div>

        <div className="lg:sticky lg:top-20">
          <RecentReviewSidebar items={recentMixed} />
        </div>
      </div>
    </div>
  );
}
