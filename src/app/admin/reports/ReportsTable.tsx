"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const REASON_LABEL: Record<string, string> = {
  abuse: "비난·욕설",
  hate: "혐오 표현",
  offtopic: "주제 이탈",
  spam: "스팸·광고",
  other: "기타",
};

type Row = {
  id: string;
  created_at: string;
  reason: string;
  detail: string | null;
  review_id: string | null;
  review_rating: number | null;
  review_comment: string | null;
  review_user_id: string | null;
  review_target_type: "track" | "album" | null;
  review_target_id: string | null;
  target_title: string | null;
  target_artist: string | null;
  reporter_id: string;
  reporter_name: string | null;
  author_name: string | null;
};

export default function ReportsTable({ initial }: { initial: Row[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const dismissReport = async (id: string) => {
    if (!confirm("이 신고를 반려(삭제)할까요?")) return;
    setBusy(id);
    const { error } = await supabase.from("review_reports").delete().eq("id", id);
    setBusy(null);
    if (error) { alert(error.message); return; }
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const deleteReview = async (row: Row) => {
    if (!row.review_id) return;
    if (!confirm("후기를 삭제할까요? (작성자 포인트는 차감되지 않아요)")) return;
    setBusy(row.id);
    const { error } = await supabase.from("reviews").delete().eq("id", row.review_id);
    setBusy(null);
    if (error) { alert(error.message); return; }
    // 같은 review에 대한 신고가 여러 개면 모두 제거
    setRows((r) => r.filter((x) => x.review_id !== row.review_id));
  };

  if (!rows.length) return <div className="card text-muted">처리할 신고가 없어요.</div>;

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const targetHref = r.review_target_type && r.review_target_id
          ? `/${r.review_target_type}s/${r.review_target_id}`
          : null;
        const deleted = !r.review_id;
        return (
          <div key={r.id} className="card space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
              <span className="chip">{REASON_LABEL[r.reason] ?? r.reason}</span>
              <span>{new Date(r.created_at).toLocaleString("ko-KR")}</span>
              <span>· 신고자: {r.reporter_name ?? "(알 수 없음)"}</span>
              {deleted && <span className="text-amber">· 후기 이미 삭제됨</span>}
            </div>

            {r.detail && (
              <div className="text-sm border-l-2 border-border pl-2 text-muted">
                “{r.detail}”
              </div>
            )}

            {!deleted && (
              <div className="rounded-md bg-panel2/60 p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{r.author_name ?? "익명"}</span>
                  {r.review_rating != null && (
                    <span className="text-accent font-bold">{Number(r.review_rating).toFixed(1)}</span>
                  )}
                  {targetHref && (
                    <Link href={targetHref} className="text-xs text-muted hover:text-white ml-auto">
                      {r.review_target_type === "track" ? "🎧" : "💿"} {r.target_title} · {r.target_artist}
                    </Link>
                  )}
                </div>
                {r.review_comment && <p className="text-sm">{r.review_comment}</p>}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => dismissReport(r.id)}
                disabled={busy === r.id}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-panel2"
              >
                반려
              </button>
              {!deleted && (
                <button
                  onClick={() => deleteReview(r)}
                  disabled={busy === r.id}
                  className="text-xs px-3 py-1.5 rounded-full border border-red-900/60 text-red-400 hover:bg-red-950/40"
                >
                  후기 삭제
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
