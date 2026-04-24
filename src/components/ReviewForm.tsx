"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();
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
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("user_id", userId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        setRating(Number(data.rating));
        setComment(data.comment ?? "");
        setInitial({ rating: Number(data.rating), comment: data.comment ?? "" });
      }
      setLoaded(true);
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
    if (isEdit) {
      if (!changed) { setBusy(false); setErr("변경된 내용이 없어요."); return; }
      if (!confirm("후기 수정은 3포인트가 차감됩니다. 계속할까요?")) { setBusy(false); return; }
      const { error } = await supabase
        .from("reviews")
        .update({ rating, comment: comment.trim() || null })
        .eq("id", existingId!);
      setBusy(false);
      if (error) {
        if (error.message.includes("not_enough_points")) setErr("포인트가 부족합니다 (3P 필요).");
        else setErr(error.message);
        return;
      }
      setInitial({ rating, comment });
      window.dispatchEvent(new CustomEvent("reviews:changed", { detail: { targetType, targetId } }));
      router.refresh();
      return;
    }
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") setErr("이미 이 대상에 평가를 남기셨습니다.");
      else setErr(error.message);
      return;
    }
    // refetch self as existing
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment")
      .eq("user_id", userId)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .maybeSingle();
    if (data) {
      setExistingId(data.id);
      setInitial({ rating: Number(data.rating), comment: data.comment ?? "" });
    }
    window.dispatchEvent(new CustomEvent("reviews:changed", { detail: { targetType, targetId } }));
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center gap-2">
        <span className="chip text-xs">{isEdit ? "내 후기 수정" : "새 후기 작성"}</span>
        {isEdit && <span className="text-xs text-muted">수정 시 3P 차감</span>}
      </div>
      <div
        className="text-[11px] leading-relaxed rounded-lg border px-3 py-2"
        style={{ borderColor: "rgba(255,179,71,0.35)", background: "rgba(255,179,71,0.06)", color: "#ffcc84" }}
      >
        ⚠️ 과도한 비난·욕설·혐오 표현, 작품과 무관한 글은 신고 대상이 됩니다. 포인트 차감 또는 계정 제재가 있을 수 있어요.
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted">점수</label>
        <input
          type="range"
          min={0}
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
        placeholder="한 줄 평 (최대 100자)"
        maxLength={100}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{comment.length}/100</span>
        <button className="btn-primary" disabled={busy || (isEdit && !changed)}>
          {isEdit ? (busy ? "수정 중…" : "수정 (-3P)") : (busy ? "등록 중…" : "평가 등록 (+2P)")}
        </button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </form>
  );
}
