"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import FamousBadge from "./FamousBadge";
import ReportModal from "./ReportModal";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: { display_name: string; avatar_url: string | null; review_count?: number; likes_received?: number };
  likes: number;
  dislikes: number;
  myReaction: 1 | -1 | 0;
};

export default function ReviewList({
  targetType,
  targetId,
  currentUserId,
}: {
  targetType: "track" | "album";
  targetId: string;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  const load = async () => {
    const { data: rows, error: rErr } = await supabase.rpc("get_reviews_with_meta", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_limit: 100,
    });
    if (rErr) {
      console.error("[reviews] load failed", rErr.message, rErr);
      setReviews([]);
      return;
    }
    const data = (rows ?? []) as any[];
    // 내 반응만 별도로 (RPC는 auth 맥락을 안 태움 → 단건 조회가 간단·빠름)
    const myMap = new Map<string, 1 | -1>();
    if (currentUserId && data.length) {
      const ids = data.map((r) => r.id);
      const { data: mine } = await supabase
        .from("review_reactions")
        .select("review_id, value")
        .eq("user_id", currentUserId)
        .in("review_id", ids);
      (mine ?? []).forEach((m: any) => myMap.set(m.review_id, m.value));
    }
    setReviews(
      data.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        profile: {
          display_name: r.display_name,
          avatar_url: r.avatar_url,
          review_count: r.review_count,
          likes_received: r.likes_received,
        },
        likes: r.likes ?? 0,
        dislikes: r.dislikes ?? 0,
        myReaction: myMap.get(r.id) ?? 0,
      }))
    );
  };

  useEffect(() => {
    load();
    const uniq = `reviews-${targetType}-${targetId}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(uniq)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `target_id=eq.${targetId}` },
        () => { load(); router.refresh(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "review_reactions" },
        () => load()
      )
      .subscribe();
    const onLocal = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d || (d.targetType === targetType && d.targetId === targetId)) load();
    };
    window.addEventListener("reviews:changed", onLocal);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("reviews:changed", onLocal);
    };
  }, [targetType, targetId, currentUserId]);

  const react = async (reviewId: string, value: 1 | -1) => {
    if (!currentUserId) { router.push("/login"); return; }
    const current = reviews.find((r) => r.id === reviewId);
    if (!current) return;
    if (current.myReaction === value) {
      await supabase.from("review_reactions").delete().match({ review_id: reviewId, user_id: currentUserId });
    } else {
      await supabase.from("review_reactions").upsert(
        { review_id: reviewId, user_id: currentUserId, value },
        { onConflict: "review_id,user_id" }
      );
    }
  };

  const remove = async (id: string) => {
    if (!confirm("5포인트를 소모하여 평가를 삭제하시겠어요?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      if (error.message.includes("not_enough_points")) alert("포인트가 부족해요 (5P 필요).");
      else alert(error.message);
      return;
    }
    window.dispatchEvent(new CustomEvent("reviews:changed", { detail: { targetType, targetId } }));
    router.refresh();
  };

  if (!reviews.length) return <div className="card text-muted">첫 번째 평가를 남겨보세요.</div>;

  return (
    <div className="space-y-3">
      {reviews.map((r) => {
        const mine = r.user_id === currentUserId;
        return (
          <div key={r.id} className="card">
            <div className="flex items-start gap-3">
              <Link href={`/u/${r.user_id}`} aria-label="프로필">
                {r.profile?.avatar_url ? (
                  <img src={r.profile.avatar_url} className="w-9 h-9 rounded-full" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-panel2" />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/u/${r.user_id}`} className="font-medium hover:text-white hover:underline underline-offset-2">
                    {r.profile?.display_name ?? "익명"}
                  </Link>
                  {(r.profile?.review_count ?? 0) >= 1000 && (r.profile?.likes_received ?? 0) >= 1000 && <FamousBadge />}
                  <span className="text-accent font-bold">{Number(r.rating).toFixed(1)}</span>
                  <span className="text-xs text-muted">{new Date(r.created_at).toLocaleString("ko-KR")}</span>
                </div>
                {r.comment && <p className="mt-1">{r.comment}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <button
                    onClick={() => react(r.id, 1)}
                    className={`flex items-center gap-1 ${r.myReaction === 1 ? "text-accent" : "text-muted hover:text-white"}`}
                    aria-label="좋아요"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h3V9H2v11zm19-9.5c0-.8-.7-1.5-1.5-1.5h-5.1l.8-3.7v-.2c0-.3-.1-.6-.3-.8L14 3l-6.6 6.6C7.1 9.9 7 10.3 7 10.7V19c0 .8.7 1.5 1.5 1.5h7c.6 0 1.1-.4 1.4-.9l2.9-6.7c.1-.2.2-.4.2-.6v-1.8z"/></svg>
                    {r.likes || ""}
                  </button>
                  <button
                    onClick={() => react(r.id, -1)}
                    className={r.myReaction === -1 ? "text-red-400" : "text-muted hover:text-white"}
                    aria-label="싫어요"
                    title="싫어요 수는 공개되지 않아요"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 4h-3v11h3V4zM3 13.5c0 .8.7 1.5 1.5 1.5h5.1l-.8 3.7v.2c0 .3.1.6.3.8l.9.9 6.6-6.6c.3-.3.4-.7.4-1.1V4.5c0-.8-.7-1.5-1.5-1.5h-7c-.6 0-1.1.4-1.4.9l-2.9 6.7c-.1.2-.2.4-.2.6v1.8z"/></svg>
                  </button>
                  {!mine && currentUserId && (
                    <button
                      onClick={() => setReportTarget(r.id)}
                      className="ml-auto text-muted hover:text-amber text-xs"
                      title="이 후기를 신고합니다"
                    >
                      🚩 신고
                    </button>
                  )}
                  {mine && (
                    <button onClick={() => remove(r.id)} className="ml-auto text-muted hover:text-red-400">
                      삭제 (-5P)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {reportTarget && (
        <ReportModal reviewId={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </div>
  );
}
