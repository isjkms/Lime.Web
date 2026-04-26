"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReview, type ReviewItem } from "@/lib/api/reviews";
import { POINTS } from "@/lib/api/points";

export default function MyReviewsClient({
  initialItems,
  stats,
}: {
  initialItems: ReviewItem[];
  stats: { reviewCount: number; likesReceived: number; avgRating: number };
}) {
  const router = useRouter();
  const [list, setList] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (id: string, createdAt: string) => {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const withinGrace = ageMs <= POINTS.graceMinutes * 60 * 1000;
    const msg = withinGrace
      ? `작성 후 ${POINTS.graceMinutes}분 이내라 무료로 삭제돼요. 진행할까요?`
      : `삭제하면 ${POINTS.reviewDelete}P가 차감돼요. 진행할까요?`;
    if (!confirm(msg)) return;
    setBusy(id);
    try {
      await deleteReview(id);
      setList((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (e: any) {
      const m = e?.message ?? "삭제 실패";
      alert(m === "not_enough_points" ? `포인트가 부족해요 (${POINTS.reviewDelete}P 필요).` : m);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="평가" value={`${stats.reviewCount}`} />
          <Stat label="받은 좋아요" value={`${stats.likesReceived}`} />
          <Stat label="평균 별점" value={stats.avgRating ? stats.avgRating.toFixed(1) : "-"} />
        </div>
      </div>

      <p className="text-muted text-sm">총 {list.length}개</p>

      {list.length === 0 ? (
        <div className="card text-muted">아직 작성한 후기가 없어요.</div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const meta = r.target === "track" ? r.track : r.album;
            const href = meta ? `/${r.target === "track" ? "tracks" : "albums"}/${meta.id}` : "#";
            const artist = (meta?.artists ?? []).map((a) => a.name).join(", ");
            return (
              <div key={r.id} className="card flex items-start gap-3 md:gap-4">
                <Link href={href} className="shrink-0">
                  {meta?.coverUrl ? (
                    <img src={meta.coverUrl} className="w-16 h-16 md:w-20 md:h-20 rounded-md object-cover" alt="" />
                  ) : (
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-md bg-panel2" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="chip">{r.target === "track" ? "🎧 TRACK" : "💿 ALBUM"}</span>
                    <Link href={href} className="font-medium hover:text-accent truncate">
                      {meta?.name ?? "(삭제된 대상)"}
                    </Link>
                    <span className="text-xs text-muted">{artist}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-accent">{Number(r.rating).toFixed(1)}</span>
                    <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString("ko-KR")}</span>
                    {r.edited && <span className="text-[10px] text-muted">(수정됨)</span>}
                  </div>
                  {r.body && <p className="mt-1 text-sm">{r.body}</p>}
                </div>
                <button
                  onClick={() => remove(r.id, r.createdAt)}
                  disabled={busy === r.id}
                  className="btn text-xs text-red-400 disabled:opacity-50"
                >
                  {busy === r.id ? "…" : "삭제"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
