"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-client";

const REASONS: { value: string; label: string }[] = [
  { value: "abuse", label: "과도한 비난·욕설" },
  { value: "hate", label: "혐오 표현" },
  { value: "offtopic", label: "작품과 무관한 내용" },
  { value: "spam", label: "스팸·광고" },
  { value: "other", label: "기타" },
];

export default function ReportModal({
  reviewId,
  onClose,
}: {
  reviewId: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [reason, setReason] = useState<string>("abuse");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const user = await getCurrentUser();
    if (!user) { setErr("로그인이 필요합니다."); setBusy(false); return; }
    const payload: any = { review_id: reviewId, reporter_id: user.id, reason };
    if (reason === "other") payload.detail = detail.trim().slice(0, 500);
    const { error } = await supabase.from("review_reports").insert(payload);
    setBusy(false);
    if (error) {
      if (error.code === "23505") setErr("이미 신고한 후기입니다.");
      else setErr(error.message);
      return;
    }
    setDone(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <>
            <h3 className="font-semibold">신고가 접수되었습니다</h3>
            <p className="text-sm text-muted">검토 후 필요한 조치를 취할게요. 감사합니다.</p>
            <button className="btn-primary w-full" onClick={onClose}>닫기</button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h3 className="font-semibold">이 후기 신고</h3>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
            {reason === "other" && (
              <textarea
                className="input"
                rows={3}
                maxLength={500}
                placeholder="사유를 적어주세요 (최대 500자)"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                required
              />
            )}
            {err && <p className="text-sm text-red-400">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="text-sm text-muted hover:text-white px-3 py-1.5">
                취소
              </button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "전송 중…" : "신고"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
