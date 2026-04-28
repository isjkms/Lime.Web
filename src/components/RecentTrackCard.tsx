"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlayer, type PlayableTrack } from "@/store/player";
import { getSpotifyToken } from "@/lib/auth-client";

type Track = {
  id: string;
  title: string;
  artist: string;
  cover_url?: string | null;
  preview_url?: string | null;
  spotify_id?: string | null;
  album_id?: string | null;
  avg?: number;
  n?: number;
  last_review_at?: string;
};

function hm(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `어제 ${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export default function RecentTrackCard({ track }: { track: Track }) {
  const { current, isPlaying, setCurrent, setPlaying } = usePlayer();
  const [hasSpotify, setHasSpotify] = useState(false);
  useEffect(() => {
    getSpotifyToken().then((t) => setHasSpotify(!!t));
  }, []);

  const isThis = current?.id === track.id;
  const playing = isThis && isPlaying;
  const canPlay = !!track.preview_url || (!!track.spotify_id && hasSpotify);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!canPlay) return;
    const payload: PlayableTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      coverUrl: track.cover_url ?? null,
      previewUrl: track.preview_url ?? null,
      spotifyId: track.spotify_id ?? null,
      albumId: track.album_id ?? null,
    };
    if (isThis) setPlaying(!isPlaying);
    else { setCurrent(payload); setPlaying(true); }
  };

  return (
    <div className="card space-y-2 hover:border-accent/60 transition group">
      <div className="relative overflow-hidden rounded-xl aspect-square">
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt=""
            className={`w-full h-full object-cover transition duration-500 ${playing ? "scale-[1.04]" : "group-hover:scale-[1.03]"}`}
          />
        ) : (
          <div className="w-full h-full bg-panel2 flex items-center justify-center text-4xl text-muted">♪</div>
        )}
        {/* 재생 버튼(이미지 클릭) */}
        <button
          onClick={toggle}
          disabled={!canPlay}
          aria-label={playing ? "일시정지" : "재생"}
          className="absolute inset-0 flex items-center justify-center group/play"
        >
          <span
            className={`w-11 h-11 rounded-full flex items-center justify-center text-fg transition
              ${playing ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"}
              ${!canPlay ? "!opacity-40 cursor-not-allowed" : ""}`}
            style={{
              background: "linear-gradient(135deg, #bef264, #facc15)",
              boxShadow: "0 6px 16px -4px rgba(0,0,0,0.5)",
            }}
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </span>
        </button>
        {typeof track.avg === "number" && track.n ? (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-xs">
            <span className="text-accent font-bold">{track.avg.toFixed(1)}</span>
          </div>
        ) : null}
        {track.last_review_at && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] tabular-nums text-fg/90">
            {hm(track.last_review_at)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <Link href={`/tracks/${track.id}`} className="font-medium line-clamp-1 hover:text-accent text-sm md:text-base">
          {track.title}
        </Link>
        <div className="text-xs md:text-sm text-muted line-clamp-1">{track.artist}</div>
      </div>
    </div>
  );
}
