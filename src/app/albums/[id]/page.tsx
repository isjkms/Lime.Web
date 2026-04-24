import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import AlbumTracks from "@/components/AlbumTracks";
import ShareButton from "@/components/ShareButton";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from("albums").select("title, artist").eq("id", id).maybeSingle();
  if (!a) return { title: "Murate" };
  const title = `${a.title} — ${a.artist}`;
  const desc = `${a.artist}의 ${a.title} · Murate에서 평가해보세요.`;
  return {
    title: `${title} · Murate`,
    description: desc,
    openGraph: {
      title, description: desc, type: "music.album",
      images: [{ url: `/api/og/album/${id}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: desc, images: [`/api/og/album/${id}`] },
  };
}

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: album } = await supabase.from("albums").select("*").eq("id", id).maybeSingle();
  if (!album) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: stats } = await supabase.from("album_stats").select("*").eq("album_id", id).maybeSingle();

  return (
    <div className="space-y-10">
      {/* 헤더 */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-panel/40 p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
          {album.cover_url ? (
            <img src={album.cover_url} className="w-48 md:w-64 aspect-square object-cover rounded-xl shadow-2xl mx-auto md:mx-0" alt="" />
          ) : (
            <div className="w-48 md:w-64 aspect-square rounded-xl bg-panel2 mx-auto md:mx-0" />
          )}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="chip">💿 ALBUM</div>
            <h1 className="text-2xl md:text-4xl font-bold">{album.title}</h1>
            <div className="text-muted">
              {album.artist}
              {album.release_date && <> · {album.release_date}</>}
              {album.total_tracks && <> · {album.total_tracks}곡</>}
            </div>
            {stats && (
              <div className="flex items-center gap-3 justify-center md:justify-start pt-2">
                <span className="text-5xl font-bold text-accent">{Number(stats.avg_rating).toFixed(1)}</span>
                <div className="text-sm text-muted">
                  / 10
                  <div>{stats.review_count}개의 평가</div>
                </div>
              </div>
            )}
            <div className="pt-2 flex justify-center md:justify-start">
              <ShareButton title={`${album.title} — ${album.artist}`} path={`/albums/${album.id}`} />
            </div>
          </div>
        </div>
        {album.cover_url && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{
              backgroundImage: `url(${album.cover_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold">나의 앨범 평가</h2>
        <ReviewForm targetType="album" targetId={album.id} userId={user?.id ?? null} />
      </section>

      {album.spotify_id && (
        <AlbumTracks spotifyAlbumId={album.spotify_id} albumId={album.id} coverUrl={album.cover_url} />
      )}

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold">모든 평가</h2>
        <ReviewList targetType="album" targetId={album.id} currentUserId={user?.id ?? null} />
      </section>
    </div>
  );
}
