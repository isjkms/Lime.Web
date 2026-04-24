"use client";
import { useEffect, useState } from "react";

export default function SpotifyConnect() {
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/spotify/user-token").then((r) => r.json()).then((d) => setConnected(!!d.token));
  }, []);
  if (connected === null || connected) return null;
  return (
    <a
      href="/api/spotify/login"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-[#1db954] text-black font-semibold hover:opacity-90"
    >
      Spotify 연결 · 풀 재생
    </a>
  );
}
