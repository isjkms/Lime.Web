"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiUrl = (p: string) => `${API_BASE.replace(/\/$/, "")}${p}`;

const LS_KEY = "lime.recentSearches";
const MAX_RECENT = 8;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveRecent(list: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX_RECENT))); } catch {}
}

type TopRow = { name: string };

export default function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const wrapRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => { setQ(sp.get("q") ?? ""); }, [sp]);
  useEffect(() => { setRecent(loadRecent()); }, []);

  // 트렌딩 제안: Lime.Api /catalog/top-rated 최근 1년 기준 트랙 6개
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          apiUrl("/catalog/top-rated?target=track&period=year&limit=6"),
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const rows: TopRow[] = await res.json();
        setTrending(rows.map((r) => r.name).filter(Boolean).slice(0, 6));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const commit = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((x) => x !== t)].slice(0, MAX_RECENT);
    setRecent(next);
    saveRecent(next);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const removeRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = recent.filter((x) => x !== term);
    setRecent(next);
    saveRecent(next);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    setRecent([]);
    saveRecent([]);
  };

  const showDropdown = open && (recent.length > 0 || trending.length > 0);

  return (
    <form
      ref={wrapRef}
      onSubmit={(e) => { e.preventDefault(); commit(q); }}
      className="flex-1 max-w-md relative"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="음악, 앨범, 아티스트 검색"
        className="w-full bg-panel2 border border-border rounded-full px-4 py-2 pl-10 text-sm outline-none focus:border-accent transition"
        autoComplete="off"
        spellCheck={false}
        type="search"
        suppressHydrationWarning
      />
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">⌕</span>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-panel shadow-2xl overflow-hidden z-40">
          {recent.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[11px] uppercase tracking-wide text-muted">최근 검색</span>
                <button type="button" onClick={clearAll} className="text-[11px] text-muted hover:text-white">
                  전체 삭제
                </button>
              </div>
              <ul>
                {recent.map((term) => (
                  <li key={term}>
                    <button
                      type="button"
                      onClick={() => commit(term)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel2 text-sm text-left"
                    >
                      <span className="text-muted">🕘</span>
                      <span className="flex-1 truncate">{term}</span>
                      <span
                        onClick={(e) => removeRecent(term, e)}
                        className="text-muted hover:text-red-400 text-xs"
                        aria-label="삭제"
                      >
                        ✕
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {trending.length > 0 && (
            <div className="p-2 border-t border-border">
              <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted">추천</div>
              <ul className="flex flex-wrap gap-1.5 px-2 pb-1">
                {trending.map((term) => (
                  <li key={term}>
                    <button
                      type="button"
                      onClick={() => commit(term)}
                      className="text-xs px-2.5 py-1 rounded-full bg-panel2 hover:bg-panel2/60 border border-border hover:border-accent transition"
                    >
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
