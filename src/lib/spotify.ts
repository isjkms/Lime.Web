import { log } from "@/lib/logger";

// 앱 수준 클라이언트 크레덴셜 (검색용)
let cachedAppToken: { token: string; exp: number } | null = null;

export async function getAppToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    log.error("spotify", "missing_credentials");
    return null;
  }
  if (cachedAppToken && cachedAppToken.exp > Date.now() + 30_000) {
    return cachedAppToken.token;
  }
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    log.error("spotify", "token_request_failed", { status: res.status, body: body.slice(0, 200) });
    return null;
  }
  const data = await res.json();
  cachedAppToken = {
    token: data.access_token,
    exp: Date.now() + data.expires_in * 1000,
  };
  return cachedAppToken.token;
}

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
    release_date: string;
  };
  duration_ms: number;
  preview_url: string | null;
};

export type SpotifyAlbum = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; width: number; height: number }[];
  release_date: string;
  total_tracks: number;
};

export async function searchSpotify(
  q: string,
  type: "track" | "album" | "track,album" = "track",
  market?: string
): Promise<{ tracks?: SpotifyTrack[]; albums?: SpotifyAlbum[] } | null> {
  const token = await getAppToken();
  if (!token) return null;
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", q);
  url.searchParams.set("type", type);
  url.searchParams.set("limit", "20");
  if (market) url.searchParams.set("market", market);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    tracks: data.tracks?.items,
    albums: data.albums?.items,
  };
}

// Spotify market — 지역화된 곡/앨범명을 받기 위해 사용.
// 지리 헤더(프로덕션)만 믿고, 그 외엔 KR 기본값 (dev 브라우저의 en-US 때문에 US로 새는 문제 방지).
export function marketFromRequest(req: Request): string {
  const h = req.headers;
  const geo = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? h.get("x-geo-country");
  if (geo && geo.length === 2) return geo.toUpperCase();
  return "KR";
}

// 사용자 OAuth (Web Playback SDK용)
export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export function spotifyAuthUrl(state: string, redirectUri: string): string {
  const id = process.env.SPOTIFY_CLIENT_ID;
  if (!id) return "#";
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", id);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}
