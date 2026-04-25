"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiUrl } from "@/lib/auth-client";
import { ensureTrack, ensureAlbum } from "@/lib/api/catalog";

type Tab = "track" | "album";

export default function SearchClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const q = sp.get("q") ?? "";

  const [tab, setTab] = useState<Tab>("track");
  const [spTracks, setSpTracks] = useState<any[]>([]);
  const [spAlbums, setSpAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setApiError(null);
    (async () => {
      try {
        const spRes = await fetch(apiUrl(`/spotify/search?q=${encodeURIComponent(q)}`)).then((r) => r.json());
        if (spRes.error) setApiError(spRes.error);
        setSpTracks(spRes.tracks ?? []);
        setSpAlbums(spRes.albums ?? []);
      } catch (e: any) {
        setApiError(e?.message ?? "search_failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  const openTrack = async (t: any) => {
    setBusy(`t-${t.id}`);
    try {
      const track = await ensureTrack(t.id);
      router.push(`/tracks/${track.id}`);
    } catch (e: any) {
      alert(e?.message ?? "불러오기 실패");
    } finally {
      setBusy(null);
    }
  };

  const openAlbum = async (a: any) => {
    setBusy(`a-${a.id}`);
    try {
      const album = await ensureAlbum(a.id);
      router.push(`/albums/${album.id}`);
    } catch (e: any) {
      alert(e?.message ?? "불러오기 실패");
    } finally {
      setBusy(null);
    }
  };

  if (!q) return <div className="card text-muted">검색어를 입력하세요.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          <span className="text-muted">검색:</span> {q}
        </h1>
        <div className="inline-flex rounded-full border border-border overflow-hidden text-sm">
          <TabBtn active={tab === "track"} onClick={() => setTab("track")}>🎧 곡 <span className="ml-1 text-xs opacity-70">{spTracks.length}</span></TabBtn>
          <TabBtn active={tab === "album"} onClick={() => setTab("album")}>💿 앨범 <span className="ml-1 text-xs opacity-70">{spAlbums.length}</span></TabBtn>
        </div>
      </div>

      {loading && <div className="text-muted">불러오는 중…</div>}
      {!loading && apiError && (
        <div className="card text-sm" style={{ borderColor: "rgba(255,179,71,0.4)" }}>
          <div className="text-amber font-medium">Spotify 검색 오류: {apiError}</div>
        </div>
      )}

      {tab === "track" && (
        <div className="space-y-2">
          {spTracks.map((t) => {
            const key = `t-${t.id}`;
            return (
              <button
                key={t.id}
                onClick={() => openTrack(t)}
                disabled={busy === key}
                className="w-full flex items-center gap-3 card py-2.5 text-left hover:border-accent transition"
              >
                <img
                  src={t.album?.images?.[2]?.url ?? t.album?.images?.[0]?.url}
                  className="w-12 h-12 rounded object-cover shrink-0"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted truncate">
                    {t.artists.map((a: any) => a.name).join(", ")} · {t.album?.name}
                  </div>
                </div>
                <span className="text-xs text-muted shrink-0">{busy === key ? "…" : "→"}</span>
              </button>
            );
          })}
          {!loading && !spTracks.length && <div className="card text-muted">곡 검색 결과가 없어요.</div>}
        </div>
      )}

      {tab === "album" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {spAlbums.map((a) => {
            const key = `a-${a.id}`;
            return (
              <button
                key={a.id}
                onClick={() => openAlbum(a)}
                disabled={busy === key}
                className="card text-left hover:border-accent transition group relative"
              >
                {a.images?.[0]?.url ? (
                  <img
                    src={a.images[0].url}
                    className="w-full aspect-square object-cover rounded-md mb-2 group-hover:scale-[1.02] transition"
                    alt=""
                  />
                ) : (
                  <div className="w-full aspect-square rounded-md bg-panel2 mb-2" />
                )}
                <div className="font-medium line-clamp-1 text-sm">{a.name}</div>
                <div className="text-xs text-muted line-clamp-1">
                  {a.artists.map((x: any) => x.name).join(", ")}
                </div>
                {busy === key && <div className="text-xs text-muted mt-1">불러오는 중…</div>}
              </button>
            );
          })}
          {!loading && !spAlbums.length && <div className="card text-muted col-span-full">앨범 검색 결과가 없어요.</div>}
        </div>
      )}

    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 transition ${active ? "text-white" : "text-muted hover:text-white"}`}
      style={active ? { background: "linear-gradient(135deg, #ff5c8a, #a78bfa)" } : undefined}
    >
      {children}
    </button>
  );
}
