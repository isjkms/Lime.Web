import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  if (type !== "track" && type !== "album") {
    return new Response("not_found", { status: 404 });
  }

  const supabase = await createClient();
  const table = type === "track" ? "tracks" : "albums";
  const statsTable = type === "track" ? "track_stats" : "album_stats";
  const statsKey = type === "track" ? "track_id" : "album_id";

  const { data: item } = await supabase.from(table).select("title, artist, cover_url").eq("id", id).maybeSingle();
  if (!item) return new Response("not_found", { status: 404 });

  const { data: stats } = await supabase.from(statsTable).select("avg_rating, review_count").eq(statsKey, id).maybeSingle();
  const avg = stats?.avg_rating != null ? Number(stats.avg_rating).toFixed(1) : "—";
  const n = stats?.review_count ?? 0;
  const emoji = type === "track" ? "🎧" : "💿";
  const label = type === "track" ? "TRACK" : "ALBUM";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0b0d12 0%, #1a0f2a 50%, #2a0f1f 100%)",
          color: "#e7e9ef",
          fontFamily: "system-ui, sans-serif",
          padding: 60,
          alignItems: "center",
          gap: 50,
        }}
      >
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_url}
            width={380}
            height={380}
            style={{ borderRadius: 24, objectFit: "cover", boxShadow: "0 25px 60px rgba(0,0,0,.5)" }}
            alt=""
          />
        ) : (
          <div style={{ width: 380, height: 380, borderRadius: 24, background: "#2a2e3a" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.12)",
                fontSize: 20,
                color: "#8a8fa0",
              }}
            >
              {emoji} {label}
            </div>
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, display: "flex" }}>
            {truncate(item.title, 60)}
          </div>
          <div style={{ fontSize: 28, color: "#8a8fa0", display: "flex" }}>
            {truncate(item.artist, 60)}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 20 }}>
            <div style={{ fontSize: 96, fontWeight: 800, color: "#ff5c8a", lineHeight: 1 }}>{avg}</div>
            <div style={{ fontSize: 24, color: "#8a8fa0", display: "flex", flexDirection: "column" }}>
              <span>/ 10</span>
              <span>{n}개의 평가</span>
            </div>
          </div>
          <div style={{ marginTop: "auto", fontSize: 22, color: "#8a8fa0", display: "flex" }}>
            Murate<span style={{ color: "#ff5c8a" }}>♪</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
