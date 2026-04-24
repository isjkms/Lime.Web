import { NextResponse } from "next/server";
import { getAppToken, marketFromRequest } from "@/lib/spotify";
import { cachedFetch } from "@/lib/spotify-cache";
import { ipFromRequest, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

const SEARCH_TTL_MS = 10 * 60 * 1000; // 10min
const PER_IP_LIMIT = 60;
const PER_IP_WINDOW_MS = 60 * 1000;

async function dbFallback(q: string) {
  try {
    const sb = await createClient();
    const pattern = `%${q}%`;
    const [tracks, albums] = await Promise.all([
      sb.from("tracks")
        .select("id, spotify_id, title, artist, album_name, cover_url, preview_url, duration_ms, release_date")
        .or(`title.ilike.${pattern},artist.ilike.${pattern}`)
        .limit(20),
      sb.from("albums")
        .select("id, spotify_id, title, artist, cover_url, release_date, total_tracks")
        .or(`title.ilike.${pattern},artist.ilike.${pattern}`)
        .limit(20),
    ]);
    return {
      tracks: (tracks.data ?? []).map((t: any) => ({
        id: t.spotify_id ?? t.id,
        name: t.title,
        artists: [{ id: "", name: t.artist }],
        album: { id: "", name: t.album_name ?? "", images: t.cover_url ? [{ url: t.cover_url, width: 300, height: 300 }] : [], release_date: t.release_date ?? "" },
        duration_ms: t.duration_ms,
        preview_url: t.preview_url,
      })),
      albums: (albums.data ?? []).map((a: any) => ({
        id: a.spotify_id ?? a.id,
        name: a.title,
        artists: [{ id: "", name: a.artist }],
        images: a.cover_url ? [{ url: a.cover_url, width: 300, height: 300 }] : [],
        release_date: a.release_date ?? "",
        total_tracks: a.total_tracks,
      })),
    };
  } catch {
    return { tracks: [], albums: [] };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ tracks: [], albums: [] });

  const ip = ipFromRequest(req);
  const rl = rateLimit(`sp:search:${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);
  if (!rl.ok) {
    log.warn("spotify/search", "rate_limited", { ip, retryAfter: rl.retryAfter });
    return NextResponse.json(
      { tracks: [], albums: [], error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const market = searchParams.get("market") ?? marketFromRequest(req);
  // 아티스트는 검색 대상에서 제외 (UI가 곡/앨범만 취급).
  const spotifyType = "track,album";
  const key = `search:${market}:${spotifyType}:${q.toLowerCase()}`;

  try {
    const data = await cachedFetch(key, SEARCH_TTL_MS, async () => {
      const token = await getAppToken();
      if (!token) throw new Error("no_token");
      const urlStr =
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}` +
        `&type=${spotifyType}`;
      log.info("spotify/search", "upstream_url", { url: urlStr, tokenHead: token.slice(0, 8), tokenLen: token.length });
      const res = await fetch(urlStr, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 429) {
        const ra = res.headers.get("retry-after") ?? "1";
        const err: any = new Error("spotify_429");
        err.retryAfter = ra;
        throw err;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        log.error("spotify/search", "upstream_fail", { status: res.status, body: body.slice(0, 200) });
        const err: any = new Error("spotify_error");
        err.status = res.status;
        err.detail = body.slice(0, 200);
        throw err;
      }
      const j = await res.json();
      return {
        tracks: j.tracks?.items ?? [],
        albums: j.albums?.items ?? [],
        market,
      };
    });
    return NextResponse.json(data);
  } catch (e: any) {
    log.warn("spotify/search", "fallback_to_db", { reason: e?.message, status: e?.status, detail: e?.detail, q });
    const fb = await dbFallback(q);
    const headers: Record<string, string> = {};
    if (e?.message === "spotify_429" && e.retryAfter) headers["Retry-After"] = String(e.retryAfter);
    return NextResponse.json(
      {
        ...fb,
        error: e?.message ?? "spotify_error",
        status: e?.status,
        detail: e?.detail,
        fallback: "db",
      },
      { headers }
    );
  }
}
