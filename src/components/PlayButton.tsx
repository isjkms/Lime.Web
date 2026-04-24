"use client";
import { useEffect, useState } from "react";
import { usePlayer, type PlayableTrack } from "@/store/player";
import { getSpotifyToken } from "@/lib/auth-client";

export default function PlayButton({ track }: { track: PlayableTrack }) {
  const { current, isPlaying, setCurrent, setPlaying } = usePlayer();
  const [hasSpotify, setHasSpotify] = useState<boolean>(false);
  useEffect(() => {
    getSpotifyToken().then((t) => setHasSpotify(!!t));
  }, []);
  const isThis = current?.id === track.id;
  const playing = isThis && isPlaying;
  const canPlay = !!track.previewUrl || (!!track.spotifyId && hasSpotify);
  const title = !canPlay
    ? track.spotifyId
      ? "미리듣기 없음 — Spotify 연결 시 풀재생 가능"
      : "재생 소스 없음"
    : undefined;

  return (
    <button
      onClick={() => {
        if (isThis) setPlaying(!isPlaying);
        else { setCurrent(track); setPlaying(true); }
      }}
      className="btn-primary text-xs md:text-sm"
      disabled={!canPlay}
      title={title}
    >
      {playing ? "❚❚" : "▶"} {playing ? "정지" : "재생"}
    </button>
  );
}
