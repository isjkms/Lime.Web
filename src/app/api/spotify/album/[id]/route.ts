import { NextResponse } from "next/server";
import { getAppToken, marketFromRequest } from "@/lib/spotify";
import { cachedFetch } from "@/lib/spotify-cache";
import { ipFromRequest, rateLimit } from "@/lib/rate-limit";

const ALBUM_TTL_MS = 60 * 60 * 1000; // 1h — album detail is near-immutable
const PER_IP_LIMIT = 120;
const PER_IP_WINDOW_MS = 60 * 1000;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = ipFromRequest(req);
  const rl = rateLimit(`sp:album:${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  const market = marketFromRequest(req);
  const key = `album:${market}:${id}`;

  try {
    const data = await cachedFetch(key, ALBUM_TTL_MS, async () => {
      const token = await getAppToken();
      if (!token) throw new Error("no_token");
      const res = await fetch(`https://api.spotify.com/v1/albums/${id}?market=${market}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 429) {
        const err: any = new Error("spotify_429");
        err.retryAfter = res.headers.get("retry-after") ?? "1";
        throw err;
      }
      if (!res.ok) throw new Error("not_found");
      const j = await res.json();
      return {
        id: j.id,
        name: j.name,
        cover: j.images?.[0]?.url ?? null,
        tracks: (j.tracks?.items ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          artists: t.artists,
          duration_ms: t.duration_ms,
          preview_url: t.preview_url,
          track_number: t.track_number,
        })),
      };
    });
    return NextResponse.json(data);
  } catch (e: any) {
    const headers: Record<string, string> = {};
    if (e?.message === "spotify_429" && e.retryAfter) headers["Retry-After"] = String(e.retryAfter);
    return NextResponse.json({ error: e?.message ?? "spotify_error" }, { status: 200, headers });
  }
}
