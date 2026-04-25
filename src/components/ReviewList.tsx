"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FamousBadge from "./FamousBadge";
import ReportModal from "./ReportModal";
import Avatar from "./Avatar";
import {
  listReviews, reactReview, unreactReview, deleteReview,
  type ReviewItem,
} from "@/lib/api/reviews";

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
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const page = await listReviews(targetType, targetId, { pageSize: 100 });
      setReviews(page.items);
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => {
    load();
    const onLocal = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d || (d.targetType === targetType && d.targetId === targetId)) load();
    };
    const onFocus = () => load();
    window.addEventListener("reviews:changed", onLocal);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("reviews:changed", onLocal);
      window.removeEventListener("focus", onFocus);
    };
  }, [targetType, targetId, currentUserId]);

  const react = async (reviewId: string, kind: "like" | "dislike") => {
    if (!currentUserId) { router.push("/login"); return; }
    const current = reviews.find((r) => r.id === reviewId);
    if (!current) return;
    try {
      if (current.myReaction === kind) await unreactReview(reviewId);
      else await reactReview(reviewId, kind);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "실패");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("평가를 삭제하시겠어요?")) return;
    try {
      await deleteReview(id);
      window.dispatchEvent(new CustomEvent("reviews:changed", { detail: { targetType, targetId } }));
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "삭제 실패");
    }
  };

  if (!reviews.length) return <div className="card text-muted">첫 번째 평가를 남겨보세요.</div>;

  return (
    <div className="space-y-3">
      {reviews.map((r) => {
        const mine = r.user.id === currentUserId;
        return (
          <div key={r.id} className="card">
            <div className="flex items-start gap-3">
              <Link href={`/u/${r.user.id}`} aria-label="프로필">
                <Avatar src={r.user.avatarUrl} seed={r.user.id} size={36} />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/u/${r.user.id}`} className="font-medium hover:text-white hover:underline underline-offset-2">
                    {r.user.name ?? "익명"}
                  </Link>
                  {r.user.reviewCount >= 1000 && r.user.likesReceived >= 1000 && <FamousBadge />}
                  <span className="text-accent font-bold">{Number(r.rating).toFixed(1)}</span>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString("ko-KR")}</span>
                </div>
                {r.body && <p className="mt-1">{r.body}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {mine ? (
                    <span className="flex items-center gap-1 text-muted">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h3V9H2v11zm19-9.5c0-.8-.7-1.5-1.5-1.5h-5.1l.8-3.7v-.2c0-.3-.1-.6-.3-.8L14 3l-6.6 6.6C7.1 9.9 7 10.3 7 10.7V19c0 .8.7 1.5 1.5 1.5h7c.6 0 1.1-.4 1.4-.9l2.9-6.7c.1-.2.2-.4.2-.6v-1.8z"/></svg>
                      {r.likes || 0}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => react(r.id, "like")}
                        className={`flex items-center gap-1 ${r.myReaction === "like" ? "text-accent" : "text-muted hover:text-white"}`}
                        aria-label="좋아요"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h3V9H2v11zm19-9.5c0-.8-.7-1.5-1.5-1.5h-5.1l.8-3.7v-.2c0-.3-.1-.6-.3-.8L14 3l-6.6 6.6C7.1 9.9 7 10.3 7 10.7V19c0 .8.7 1.5 1.5 1.5h7c.6 0 1.1-.4 1.4-.9l2.9-6.7c.1-.2.2-.4.2-.6v-1.8z"/></svg>
                        {r.likes || ""}
                      </button>
                      <button
                        onClick={() => react(r.id, "dislike")}
                        className={r.myReaction === "dislike" ? "text-red-400" : "text-muted hover:text-white"}
                        aria-label="싫어요"
                        title="싫어요 수는 공개되지 않아요"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 4h-3v11h3V4zM3 13.5c0 .8.7 1.5 1.5 1.5h5.1l-.8 3.7v.2c0 .3.1.6.3.8l.9.9 6.6-6.6c.3-.3.4-.7.4-1.1V4.5c0-.8-.7-1.5-1.5-1.5h-7c-.6 0-1.1.4-1.4.9l-2.9 6.7c-.1.2-.2.4-.2.6v1.8z"/></svg>
                      </button>
                    </>
                  )}
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
                      삭제
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
