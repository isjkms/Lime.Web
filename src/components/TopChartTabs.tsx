"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type Item = { id: string; title: string; artist: string; cover_url?: string | null; avg?: number; n?: number; first_review_at?: string | null };

function isNew(iso?: string | null) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

export default function TopChartTabs({
  tracks,
  albums,
}: {
  tracks: { day: Item[]; month: Item[]; year: Item[] };
  albums: { day: Item[]; month: Item[]; year: Item[] };
}) {
  const [tab, setTab] = useState<"track" | "album">("track");
  const set = tab === "track" ? tracks : albums;
  const hrefPrefix = tab === "track" ? "/tracks" : "/albums";

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-lg md:text-xl font-semibold">🏆 탑 차트</h2>
        <div className="inline-flex rounded-full border border-border overflow-hidden text-sm">
          <TabBtn active={tab === "track"} onClick={() => setTab("track")}>🎧 곡</TabBtn>
          <TabBtn active={tab === "album"} onClick={() => setTab("album")}>💿 앨범</TabBtn>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Column title="오늘" items={set.day} hrefPrefix={hrefPrefix} />
        <Column title="이달" items={set.month} hrefPrefix={hrefPrefix} />
        <Column title="올해" items={set.year} hrefPrefix={hrefPrefix} />
      </div>
    </section>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 transition ${active ? "text-white" : "text-muted hover:text-white"}`}
      style={active ? { background: "linear-gradient(135deg, #ff5c8a, #a78bfa)" } : undefined}
    >
      {children}
    </button>
  );
}

function Column({ title, items, hrefPrefix }: { title: string; items: Item[]; hrefPrefix: string }) {
  return (
    <div className="card">
      <div className="text-sm text-muted mb-3">{title}</div>
      {items.length ? (
        <ol className="space-y-1">
          {items.slice(0, 5).map((it, i) => (
            <li key={it.id}>
              <Link
                href={`${hrefPrefix}/${it.id}`}
                className="flex items-center gap-3 py-1.5 hover:bg-white/5 rounded-lg px-2 -mx-2"
              >
                <span className="text-sm text-muted w-4 text-center tabular-nums">{i + 1}</span>
                {it.cover_url ? (
                  <div className="relative w-9 h-9 rounded-md overflow-hidden shrink-0">
                    <Image src={it.cover_url} alt="" fill sizes="36px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-md bg-panel2 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate flex items-center gap-1.5">
                    <span className="truncate">{it.title}</span>
                    {isNew(it.first_review_at) && (
                      <span
                        className="shrink-0 text-[9px] font-bold px-1.5 py-[1px] rounded-full"
                        style={{ background: "linear-gradient(135deg, #ff5c8a, #a78bfa)", color: "white" }}
                      >
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted truncate">{it.artist}</div>
                </div>
                {typeof it.avg === "number" && it.n ? (
                  <span className="text-sm text-accent font-semibold tabular-nums">{it.avg.toFixed(1)}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-sm text-muted">집계된 평가가 없어요.</div>
      )}
    </div>
  );
}
