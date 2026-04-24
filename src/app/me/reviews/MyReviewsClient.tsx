"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  target_type: "track" | "album";
  target_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  target: { id: string; title: string; artist: string; cover_url: string | null } | null;
};

export default function MyReviewsClient({ items, initialPoints }: { items: Item[]; initialPoints: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [list, setList] = useState(items);
  const [points, setPoints] = useState(initialPoints);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (points < 5) return alert("포인트가 부족해요 (5P 필요).");
    if (!confirm("5포인트를 소모하여 이 후기를 삭제할까요?")) return;
    setBusy(id);
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    setBusy(null);
    if (error) {
      alert(error.message.includes("not_enough_points") ? "포인트가 부족해요 (5P 필요)." : error.message);
      return;
    }
    setList((prev) => prev.filter((r) => r.id !== id));
    setPoints((p) => p - 5);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 후기</h1>
          <p className="text-muted text-sm">총 {list.length}개 · 보유 포인트 <span className="text-accent font-semibold">{points}P</span></p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card text-muted">아직 작성한 후기가 없어요.</div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const href = r.target ? `/${r.target_type === "track" ? "tracks" : "albums"}/${r.target_id}` : "#";
            return (
              <div key={r.id} className="card flex items-start gap-3 md:gap-4">
                <Link href={href} className="shrink-0">
                  {r.target?.cover_url ? (
                    <img src={r.target.cover_url} className="w-16 h-16 md:w-20 md:h-20 rounded-md object-cover" alt="" />
                  ) : (
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-md bg-panel2" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="chip">{r.target_type === "track" ? "🎧 TRACK" : "💿 ALBUM"}</span>
                    <Link href={href} className="font-medium hover:text-accent truncate">
                      {r.target?.title ?? "(삭제된 대상)"}
                    </Link>
                    <span className="text-xs text-muted">{r.target?.artist}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-accent">{Number(r.rating).toFixed(1)}</span>
                    <span className="text-xs text-muted">{new Date(r.created_at).toLocaleString("ko-KR")}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                </div>
                <button
                  onClick={() => remove(r.id)}
                  disabled={busy === r.id || points < 5}
                  className="btn text-xs text-red-400 disabled:opacity-50"
                  title={points < 5 ? "포인트 부족 (5P 필요)" : undefined}
                >
                  {busy === r.id ? "…" : "삭제 (-5P)"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
