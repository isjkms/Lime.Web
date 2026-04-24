import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FamousBadge from "@/components/FamousBadge";

export const revalidate = 60;

type Row = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  review_count: number;
  likes_received: number;
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort === "count" ? "count" : "likes";
  const supabase = await createClient();

  const query = supabase
    .from("profiles")
    .select("id, display_name, avatar_url, review_count, likes_received")
    .limit(100);

  const { data, error } =
    sort === "count"
      ? await query.order("review_count", { ascending: false }).order("likes_received", { ascending: false })
      : await query.order("likes_received", { ascending: false }).order("review_count", { ascending: false });

  const rows = (data ?? []).filter((r: Row) => r.review_count > 0) as Row[];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">리더보드</h1>
          <p className="text-sm text-muted mt-1">평가를 많이 남기고, 공감을 많이 얻은 리스너.</p>
        </div>
        <div className="inline-flex rounded-full border border-border overflow-hidden text-sm">
          <TabLink href="/leaderboard?sort=likes" active={sort === "likes"}>👍 받은 좋아요</TabLink>
          <TabLink href="/leaderboard?sort=count" active={sort === "count"}>📝 평가 수</TabLink>
        </div>
      </div>

      {error && <div className="card text-sm text-red-400">불러오기 실패: {error.message}</div>}

      {!rows.length ? (
        <div className="card text-muted">아직 집계할 데이터가 없어요.</div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => {
            const rank = i + 1;
            const famous = (r.review_count ?? 0) >= 1000 && (r.likes_received ?? 0) >= 1000;
            return (
              <li key={r.id}>
                <Link href={`/u/${r.id}`} className="card flex items-center gap-3 hover:border-accent transition">
                <div
                  className={`w-8 text-center text-lg font-bold tabular-nums ${
                    rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-muted"
                  }`}
                >
                  {rank}
                </div>
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-panel2" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{r.display_name}</span>
                    {famous && <FamousBadge />}
                  </div>
                  <div className="text-xs text-muted">
                    평가 {r.review_count}개 · 좋아요 {r.likes_received}개
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-accent tabular-nums">
                    {sort === "count" ? r.review_count : r.likes_received}
                  </div>
                  <div className="text-[10px] text-muted">
                    {sort === "count" ? "평가" : "좋아요"}
                  </div>
                </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function TabLink({
  href, active, children,
}: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 transition ${active ? "text-white" : "text-muted hover:text-white"}`}
      style={active ? { background: "linear-gradient(135deg, #ff5c8a, #a78bfa)" } : undefined}
    >
      {children}
    </Link>
  );
}
