import Link from "next/link";
import { cookies } from "next/headers";
import TopChartTabs from "@/components/TopChartTabs";
import RecentReviewTable from "@/components/RecentReviewTable";
import FamousFeed from "@/components/FamousFeed";
import { getCurrentUser } from "@/lib/auth";
import { getRecentlyReviewed, getTopRated, getFamousRecentReviews, getFollowingFeed } from "@/lib/queries";

export const revalidate = 0;

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const viewer = await getCurrentUser();

  const [
    recentTracks,
    recentAlbums,
    tDay, tMonth, tYear,
    aDay, aMonth, aYear,
    famous,
    followingFeed,
  ] = await Promise.all([
    getRecentlyReviewed("track", 8),
    getRecentlyReviewed("album", 8),
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
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border px-6 py-10 md:py-14"
        style={{ background: "linear-gradient(135deg, rgba(255,92,138,0.08) 0%, rgba(167,139,250,0.08) 100%)" }}>
        <div className="relative z-10 max-w-2xl">
          <div className="chip mb-2">♪ 10점 만점 · 100자 한 줄 리뷰</div>
          <h1 className="text-2xl md:text-4xl font-bold leading-tight">
            <span className="gradient-text">한 줄</span>로 남기는 오늘의 감상
          </h1>
          <p className="mt-3 text-muted text-sm">검색 한 번, Spotify에서 바로 불러와 평가하세요.</p>
          <div className="mt-5">
            <Link href="/search" className="btn-primary">🔎 곡·앨범 검색하기</Link>
          </div>
        </div>
        <div aria-hidden className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,92,138,0.25), transparent)" }} />
        <div aria-hidden className="absolute -left-20 -top-20 w-72 h-72 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(167,139,250,0.25), transparent)" }} />
      </section>

      {/* Top chart (tabs) */}
      <TopChartTabs
        tracks={{ day: tDay, month: tMonth, year: tYear }}
        albums={{ day: aDay, month: aMonth, year: aYear }}
      />

      {/* Recent reviews — 테이블 */}
      <section className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg md:text-xl font-semibold mb-3">🎧 최근 후기 · 음악</h2>
          <RecentReviewTable target="track" rows={recentTracks as any} />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold mb-3">💿 최근 후기 · 앨범</h2>
          <RecentReviewTable target="album" rows={recentAlbums as any} />
        </div>
      </section>

      {/* 팔로우한 사용자의 최신 후기 */}
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

      {/* 유명 평가자 */}
      <section>
        <h2 className="text-lg md:text-xl font-semibold mb-3">★ 유명 평가자의 최근 후기</h2>
        <FamousFeed items={famous as any} />
      </section>
    </div>
  );
}
