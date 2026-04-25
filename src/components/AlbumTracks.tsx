"use client";
import Link from "next/link";
import PlayButton from "./PlayButton";
import type { AlbumTrack } from "@/lib/api/catalog";

export default function AlbumTracks({
  tracks,
  coverUrl,
}: {
  tracks: AlbumTrack[];
  coverUrl: string | null;
}) {
  if (!tracks.length) return null;
  return (
    <section>
      <h2 className="text-lg md:text-xl font-semibold mb-3">수록곡</h2>
      <div className="card divide-y divide-border p-0 overflow-hidden">
        {tracks.map((t) => {
          const artist = t.artists.map((a) => a.name).join(", ");
          const mins = t.durationMs ? Math.floor(t.durationMs / 60000) : 0;
          const secs = t.durationMs
            ? Math.floor((t.durationMs % 60000) / 1000).toString().padStart(2, "0")
            : "00";
          return (
            <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-panel2/60 transition">
              <span className="text-muted text-sm w-6 text-right tabular-nums">{t.trackNumber ?? ""}</span>
              <Link href={`/tracks/${t.id}`} className="flex-1 min-w-0 text-left">
                <div className="truncate text-sm hover:text-accent transition">{t.name}</div>
                <div className="truncate text-xs text-muted">{artist}</div>
              </Link>
              {t.durationMs && (
                <span className="text-xs text-muted tabular-nums hidden sm:inline shrink-0">{mins}:{secs}</span>
              )}
              <PlayButton
                track={{
                  id: t.id,
                  title: t.name,
                  artist,
                  coverUrl,
                  previewUrl: t.previewUrl,
                  spotifyId: t.spotifyId,
                  albumId: null,
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
