"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getSpotifyToken, spotifyConnectUrl } from "@/lib/auth-client";

export default function SpotifyConnect() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
  useEffect(() => {
    getSpotifyToken().then((t) => setConnected(!!t));
  }, []);
  if (connected === null || connected) return null;
  return (
    <a
      href={spotifyConnectUrl(returnTo)}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-[#1db954] text-black font-semibold hover:opacity-90"
    >
      Spotify 연결 · 풀 재생
    </a>
  );
}
