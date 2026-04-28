import Link from "next/link";
import { relativeTime } from "@/lib/relativeTime";
import type { RecentMixedItem } from "@/lib/queries";

export default function RecentReviewSidebar({ items }: { items: RecentMixedItem[] }) {
  return (
    <aside className="card p-0 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between text-sm">
        <span className="font-semibold">최근 평가</span>
        <span className="text-[10px] text-muted">실시간</span>
      </div>
      {!items.length ? (
        <div className="px-4 py-6 text-sm text-muted text-center">아직 없어요.</div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => {
            const href = it.kind === "track" ? `/tracks/${it.id}` : `/albums/${it.id}`;
            const kindIcon = it.kind === "track" ? "🎧" : "💿";
            return (
              <li key={`${it.kind}:${it.id}`}>
                <Link
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-panel2 transition"
                >
                  {it.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.coverUrl}
                      alt=""
                      className="w-9 h-9 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded bg-panel2 flex items-center justify-center text-xs shrink-0">
                      {kindIcon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-sm leading-tight">
                    <div className="truncate font-medium">{it.title}</div>
                    <div className="truncate text-xs text-muted">{it.artist}</div>
                  </div>
                  <span className="text-[10px] text-muted tabular-nums shrink-0">
                    {relativeTime(it.lastReviewAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
