"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiUrl, getCurrentUser } from "@/lib/auth-client";

type Tab = "track" | "album";

export default function SearchClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const q = sp.get("q") ?? "";

  const [tab, setTab] = useState<Tab>("track");
  const [spTracks, setSpTracks] = useState<any[]>([]);
  const [spAlbums, setSpAlbums] = useState<any[]>([]);
  const [localTrackIds, setLocalTrackIds] = useState<Record<string, string>>({});
  const [localAlbumIds, setLocalAlbumIds] = useState<Record<string, string>>({});
  // 실제 "후기 있음" 판별: reviews 테이블에 해당 target에 대한 row가 1개 이상일 때.
  const [reviewedTrackIds, setReviewedTrackIds] = useState<Set<string>>(new Set());
  const [reviewedAlbumIds, setReviewedAlbumIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setApiError(null);
    (async () => {
      const spRes = await fetch(apiUrl(`/spotify/search?q=${encodeURIComponent(q)}`)).then((r) => r.json());
      const tracks = spRes.tracks ?? [];
      const albums = spRes.albums ?? [];
      if (spRes.error) setApiError(spRes.error);
      setSpTracks(tracks);
      setSpAlbums(albums);

      // 이미 등록된 항목 매핑
      const tIds = tracks.map((t: any) => t.id);
      const aIds = albums.map((a: any) => a.id);
      const [tExist, aExist] = await Promise.all([
        tIds.length
          ? supabase.from("tracks").select("id, spotify_id").in("spotify_id", tIds)
          : Promise.resolve({ data: [] as any[] }),
        aIds.length
          ? supabase.from("albums").select("id, spotify_id").in("spotify_id", aIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const tMap: Record<string, string> = {};
      (tExist.data ?? []).forEach((r: any) => r.spotify_id && (tMap[r.spotify_id] = r.id));
      const aMap: Record<string, string> = {};
      (aExist.data ?? []).forEach((r: any) => r.spotify_id && (aMap[r.spotify_id] = r.id));
      setLocalTrackIds(tMap);
      setLocalAlbumIds(aMap);

      // 후기가 1건 이상 있는 target만 "✓ 후기"로 표시.
      const localTrackDbIds = Object.values(tMap);
      const localAlbumDbIds = Object.values(aMap);
      const [tRev, aRev] = await Promise.all([
        localTrackDbIds.length
          ? supabase.from("reviews").select("target_id").eq("target_type", "track").in("target_id", localTrackDbIds)
          : Promise.resolve({ data: [] as any[] }),
        localAlbumDbIds.length
          ? supabase.from("reviews").select("target_id").eq("target_type", "album").in("target_id", localAlbumDbIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setReviewedTrackIds(new Set((tRev.data ?? []).map((r: any) => r.target_id)));
      setReviewedAlbumIds(new Set((aRev.data ?? []).map((r: any) => r.target_id)));

      setLoading(false);
    })();
  }, [q]);

  const openTrack = async (t: any) => {
    if (localTrackIds[t.id]) { router.push(`/tracks/${localTrackIds[t.id]}`); return; }
    setBusy(`t-${t.id}`);
    const user = await getCurrentUser();
    if (!user) { router.push("/login"); return; }

    // 앨범 먼저 upsert — 곡의 album_id를 채워 앨범 평가 페이지로 바로 이동할 수 있게
    let albumDbId: string | null = (t.album?.id && localAlbumIds[t.album.id]) || null;
    if (!albumDbId && t.album?.id) {
      const { data: albumRow, error: aErr } = await supabase.from("albums")
        .upsert(
          {
            spotify_id: t.album.id,
            title: t.album.name,
            artist: (t.album.artists ?? t.artists).map((x: any) => x.name).join(", "),
            cover_url: t.album.images?.[0]?.url ?? null,
            release_date: t.album.release_date ?? null,
            total_tracks: t.album.total_tracks ?? null,
            added_by: user.id,
          },
          { onConflict: "spotify_id" }
        )
        .select("id").single();
      if (!aErr) albumDbId = albumRow?.id ?? null;
    }

    const { data, error } = await supabase.from("tracks").insert({
      spotify_id: t.id,
      title: t.name,
      artist: t.artists.map((a: any) => a.name).join(", "),
      album_name: t.album?.name ?? null,
      album_id: albumDbId,
      cover_url: t.album?.images?.[0]?.url ?? null,
      preview_url: t.preview_url,
      duration_ms: t.duration_ms,
      release_date: t.album?.release_date ?? null,
      added_by: user.id,
    }).select("id").single();
    setBusy(null);
    if (error) { alert(error.message); return; }
    router.push(`/tracks/${data.id}`);
  };

  const openAlbum = async (a: any) => {
    if (localAlbumIds[a.id]) { router.push(`/albums/${localAlbumIds[a.id]}`); return; }
    setBusy(`a-${a.id}`);
    const user = await getCurrentUser();
    if (!user) { router.push("/login"); return; }
    const { data, error } = await supabase.from("albums").insert({
      spotify_id: a.id,
      title: a.name,
      artist: a.artists.map((x: any) => x.name).join(", "),
      cover_url: a.images?.[0]?.url ?? null,
      release_date: a.release_date,
      total_tracks: a.total_tracks,
      added_by: user.id,
    }).select("id").single();
    setBusy(null);
    if (error) { alert(error.message); return; }
    router.push(`/albums/${data.id}`);
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
            const dbId = localTrackIds[t.id];
            const reviewed = !!dbId && reviewedTrackIds.has(dbId);
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
                {reviewed ? (
                  <span className="chip text-xs shrink-0">✓ 후기</span>
                ) : (
                  <span className="text-xs text-muted shrink-0">
                    {busy === key ? "…" : "→"}
                  </span>
                )}
              </button>
            );
          })}
          {!loading && !spTracks.length && <div className="card text-muted">곡 검색 결과가 없어요.</div>}
        </div>
      )}

      {tab === "album" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {spAlbums.map((a) => {
            const dbId = localAlbumIds[a.id];
            const reviewed = !!dbId && reviewedAlbumIds.has(dbId);
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
                {reviewed && (
                  <span className="absolute top-3 right-3 chip text-[10px]">✓ 후기</span>
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
