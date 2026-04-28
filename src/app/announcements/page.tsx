import type { Metadata } from "next";
import { getAnnouncements, CATEGORY_LABEL } from "@/lib/announcements";

export const metadata: Metadata = { title: "공지 · Lime" };

export default function AnnouncementsPage() {
  const items = getAnnouncements();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">공지·업데이트</h1>
        <p className="text-sm text-muted mt-1">새 기능, 정책 변경, 점검 안내를 확인하세요.</p>
      </div>

      {items.length === 0 ? (
        <div className="card text-muted">아직 공지가 없어요.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="card">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="chip">{CATEGORY_LABEL[a.category]}</span>
                <span className="text-muted tabular-nums">{a.date}</span>
              </div>
              <h2 className="text-lg font-semibold mt-2">{a.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-fg/90">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
