"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-client";
import PlayButton from "./PlayButton";

export default function AlbumTracks({
  spotifyAlbumId,
  albumId,
  coverUrl,
}: {
  spotifyAlbumId: string;
  albumId: string;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [tracks, setTracks] = useState<any[]>([]);
  const [localMap, setLocalMap] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/spotify/album/${spotifyAlbumId}`);
      const d = await r.json();
      if (d.tracks) {
        setTracks(d.tracks);
        const ids = d.tracks.map((t: any) => t.id);
        const { data: existing } = await supabase
          .from("tracks")
          .select("id, spotify_id")
          .in("spotify_id", ids);
        const m = new Map<string, string>();
        (existing ?? []).forEach((e) => e.spotify_id && m.set(e.spotify_id, e.id));
        setLocalMap(m);
      }
    })();
  }, [spotifyAlbumId]);

  const openTrack = async (t: any) => {
    const existingId = localMap.get(t.id);
    if (existingId) { router.push(`/tracks/${existingId}`); return; }
    setBusy(t.id);
    const user = await getCurrentUser();
    if (!user) { router.push("/login"); return; }
    const { data, error } = await supabase.from("tracks").insert({
      spotify_id: t.id,
      title: t.name,
      artist: t.artists.map((a: any) => a.name).join(", "),
      album_id: albumId,
      cover_url: coverUrl,
      preview_url: t.preview_url,
      duration_ms: t.duration_ms,
      added_by: user.id,
    }).select("id").single();
    setBusy(null);
    if (error) { alert(error.message); return; }
    router.push(`/tracks/${data.id}`);
  };

  if (!tracks.length) return null;

  return (
    <section>
      <h2 className="text-lg md:text-xl font-semibold mb-3">수록곡</h2>
      <div className="card divide-y divide-border p-0 overflow-hidden">
        {tracks.map((t) => {
          const localId = localMap.get(t.id);
          const mins = Math.floor(t.duration_ms / 60000);
          const secs = Math.floor((t.duration_ms % 60000) / 1000).toString().padStart(2, "0");
          const loading = busy === t.id;
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 hover:bg-panel2/60 transition"
            >
              <span className="text-muted text-sm w-6 text-right tabular-nums">{t.track_number}</span>
              <button
                onClick={() => openTrack(t)}
                disabled={loading}
                className="flex-1 min-w-0 text-left"
                title={localId ? "평가 페이지로" : "불러와서 평가하기"}
              >
                <div className="truncate text-sm hover:text-accent transition flex items-center gap-2">
                  {t.name}
                  {localId && <span className="chip text-[10px]">✓</span>}
                  {loading && <span className="text-xs text-muted">…</span>}
                </div>
                <div className="truncate text-xs text-muted">
                  {t.artists.map((a: any) => a.name).join(", ")}
                </div>
              </button>
              <span className="text-xs text-muted tabular-nums hidden sm:inline shrink-0">{mins}:{secs}</span>
              <PlayButton
                track={{
                  id: localId ?? `sp:${t.id}`,
                  title: t.name,
                  artist: t.artists.map((a: any) => a.name).join(", "),
                  coverUrl,
                  previewUrl: t.preview_url,
                  spotifyId: t.id,
                  albumId,
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
