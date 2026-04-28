"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePlayer } from "@/store/player";
import { getSpotifyToken } from "@/lib/auth-client";

type Row = {
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
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  if (d.toDateString() === now.toDateString()) return `${hh}:${mm}`;
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `어제 ${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export default function RecentReviewTable({
  target,
  rows,
}: {
  target: "track" | "album";
  rows: Row[];
}) {
  return (
    <div className="card p-0 overflow-hidden divide-y divide-border">
      {rows.length ? rows.map((r) => (
        <RowView key={r.id} target={target} row={r} />
      )) : (
        <div className="p-6 text-sm text-muted">아직 후기가 없어요.</div>
      )}
    </div>
  );
}

function RowView({ target, row }: { target: "track" | "album"; row: Row }) {
  const { current, isPlaying, setCurrent, setPlaying } = usePlayer();
  const [hasSpotify, setHasSpotify] = useState(false);
  useEffect(() => {
    if (target !== "track") return;
    getSpotifyToken().then((t) => setHasSpotify(!!t));
  }, [target]);

  const isThis = target === "track" && current?.id === row.id;
  const playing = isThis && isPlaying;
  const canPlay = target === "track" && (!!row.preview_url || (!!row.spotify_id && hasSpotify));
  const href = target === "track" ? `/tracks/${row.id}` : `/albums/${row.id}`;

  const toggle = () => {
    if (!canPlay) return;
    if (isThis) { setPlaying(!isPlaying); return; }
    setCurrent({
      id: row.id,
      title: row.title,
      artist: row.artist,
      coverUrl: row.cover_url ?? null,
      previewUrl: row.preview_url ?? null,
      spotifyId: row.spotify_id ?? null,
      albumId: row.album_id ?? null,
    });
    setPlaying(true);
  };

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-panel2/40 transition">
      {/* 썸네일 — 곡이면 클릭 재생, 앨범이면 링크 */}
      {target === "track" ? (
        <button
          onClick={toggle}
          disabled={!canPlay}
          className="relative shrink-0 rounded-lg overflow-hidden w-12 h-12 md:w-14 md:h-14 group"
          title={canPlay ? (playing ? "일시정지" : "재생") : "재생 소스 없음"}
        >
          {row.cover_url ? (
            <Image
              src={row.cover_url}
              alt=""
              fill
              sizes="56px"
              className={`object-cover ${playing ? "brightness-75" : "group-hover:brightness-75"} transition`}
            />
          ) : (
            <div className="w-full h-full bg-panel2 flex items-center justify-center text-muted">♪</div>
          )}
          <span
            className={`absolute inset-0 flex items-center justify-center text-fg transition
              ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
              ${!canPlay ? "!opacity-30" : ""}`}
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </span>
        </button>
      ) : (
        <Link href={href} className="relative shrink-0 rounded-lg overflow-hidden w-12 h-12 md:w-14 md:h-14 block">
          {row.cover_url ? (
            <Image src={row.cover_url} alt="" fill sizes="56px" className="object-cover hover:brightness-90 transition" />
          ) : (
            <div className="w-full h-full bg-panel2 flex items-center justify-center text-muted">💿</div>
          )}
        </Link>
      )}

      {/* 제목/아티스트 */}
      <Link href={href} className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate hover:text-accent transition">{row.title}</div>
        <div className="text-xs text-muted truncate">{row.artist}</div>
      </Link>

      {/* 평점 */}
      {typeof row.avg === "number" && row.n ? (
        <div className="hidden sm:flex flex-col items-end shrink-0 w-14">
          <span className="text-sm font-semibold text-accent tabular-nums">{row.avg.toFixed(1)}</span>
          <span className="text-[10px] text-muted">{row.n}개</span>
        </div>
      ) : null}

      {/* 후기 시각 */}
      <div className="shrink-0 text-xs text-muted tabular-nums w-16 text-right">
        {hm(row.last_review_at)}
      </div>
    </div>
  );
}
