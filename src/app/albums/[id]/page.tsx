import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getAlbum } from "@/lib/api/catalog";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import AlbumTracks from "@/components/AlbumTracks";
import ShareButton from "@/components/ShareButton";

export const revalidate = 0;

async function fetchAlbumServer(id: string) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  return getAlbum(id, { headers: cookieHeader ? { cookie: cookieHeader } : undefined });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const album = await fetchAlbumServer(id);
  if (!album) return { title: "Lime" };
  const artist = album.artists.map((a) => a.name).join(", ");
  const title = `${album.name} — ${artist}`;
  const desc = `${artist}의 ${album.name} · Lime에서 평가해보세요.`;
  return {
    title: `${title} · Lime`,
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
  const album = await fetchAlbumServer(id);
  if (!album) notFound();
  const user = await getCurrentUser();
  const artist = album.artists.map((a) => a.name).join(", ");

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-panel/40 p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
          {album.coverUrl ? (
            <img src={album.coverUrl} className="w-48 md:w-64 aspect-square object-cover rounded-xl shadow-2xl mx-auto md:mx-0" alt="" />
          ) : (
            <div className="w-48 md:w-64 aspect-square rounded-xl bg-panel2 mx-auto md:mx-0" />
          )}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="chip">💿 ALBUM</div>
            <h1 className="text-2xl md:text-4xl font-bold">{album.name}</h1>
            <div className="text-muted">
              {artist}
              {album.releaseDate && <> · {album.releaseDate}</>}
              {album.tracks.length > 0 && <> · {album.tracks.length}곡</>}
            </div>
            {album.stats.reviewCount > 0 && (
              <div className="flex items-center gap-3 justify-center md:justify-start pt-2">
                <span className="text-5xl font-bold text-accent">{Number(album.stats.avgRating).toFixed(1)}</span>
                <div className="text-sm text-muted">
                  / 10
                  <div>{album.stats.reviewCount}개의 평가</div>
                </div>
              </div>
            )}
            <div className="pt-2 flex justify-center md:justify-start">
              <ShareButton title={`${album.name} — ${artist}`} path={`/albums/${album.id}`} />
            </div>
          </div>
        </div>
        {album.coverUrl && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{
              backgroundImage: `url(${album.coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold">나의 앨범 평가</h2>
        <ReviewForm targetType="album" targetId={album.spotifyId} userId={user?.id ?? null} />
      </section>

      <AlbumTracks
        tracks={album.tracks.map((t) => ({
          id: t.id,
          spotifyId: t.spotifyId,
          name: t.name,
          trackNumber: t.trackNumber,
          durationMs: t.durationMs,
          previewUrl: t.previewUrl,
          artists: t.artists,
        }))}
        coverUrl={album.coverUrl}
      />

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold">모든 평가</h2>
        <ReviewList targetType="album" targetId={album.spotifyId} currentUserId={user?.id ?? null} />
      </section>
    </div>
  );
}
