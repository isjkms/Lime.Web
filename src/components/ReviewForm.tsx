"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listReviews, upsertReview } from "@/lib/api/reviews";

export default function ReviewForm({
  targetType,
  targetId,
  userId,
}: {
  targetType: "track" | "album";
  targetId: string;
  userId: string | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(8);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [initial, setInitial] = useState<{ rating: number; comment: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) { setLoaded(true); return; }
    (async () => {
      try {
        const page = await listReviews(targetType, targetId, { pageSize: 50 });
        const mine = page.items.find((r) => r.user.id === userId);
        if (mine) {
          setExistingId(mine.id);
          setRating(Number(mine.rating));
          setComment(mine.body ?? "");
          setInitial({ rating: Number(mine.rating), comment: mine.body ?? "" });
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, [userId, targetType, targetId]);

  if (!userId) {
    return (
      <div className="card text-sm text-muted">
        평가를 남기려면 <a href="/login" className="text-accent">로그인</a>하세요.
      </div>
    );
  }
  if (!loaded) return <div className="card text-sm text-muted">불러오는 중…</div>;

  const isEdit = !!existingId;
  const changed = isEdit && initial && (initial.rating !== rating || (initial.comment ?? "") !== comment);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body = comment.trim();
      if (!body) { setErr("한 줄 평을 입력해 주세요."); return; }
      await upsertReview({ target: targetType, spotifyId: targetId, rating, body });
      setInitial({ rating, comment: body });
      window.dispatchEvent(new CustomEvent("reviews:changed", { detail: { targetType, targetId } }));
      router.refresh();
      if (!existingId) {
        const page = await listReviews(targetType, targetId, { pageSize: 50 });
        const mine = page.items.find((r) => r.user.id === userId);
        if (mine) setExistingId(mine.id);
      }
    } catch (e: any) {
      setErr(e?.message ?? "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center gap-2">
        <span className="chip text-xs">{isEdit ? "내 후기 수정" : "새 후기 작성"}</span>
      </div>
      <div
        className="text-[11px] leading-relaxed rounded-lg border px-3 py-2"
        style={{ borderColor: "rgba(255,179,71,0.35)", background: "rgba(255,179,71,0.06)", color: "#ffcc84" }}
      >
        ⚠️ 과도한 비난·욕설·혐오 표현, 작품과 무관한 글은 신고 대상이 됩니다.
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted">점수</label>
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.5}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="flex-1"
        />
        <div className="text-2xl font-bold text-accent w-12 text-right">{rating.toFixed(1)}</div>
      </div>
      <input
        className="input"
        placeholder="한 줄 평 (최대 140자)"
        maxLength={140}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{comment.length}/140</span>
        <button className="btn-primary" disabled={busy || (isEdit && !changed)}>
          {isEdit ? (busy ? "수정 중…" : "수정") : (busy ? "등록 중…" : "평가 등록")}
        </button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </form>
  );
}
