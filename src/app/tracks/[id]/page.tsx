import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTrack } from "@/lib/api/catalog";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import PlayButton from "@/components/PlayButton";
import ShareButton from "@/components/ShareButton";

export const revalidate = 0;

async function fetchTrackServer(id: string) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  return getTrack(id, { headers: cookieHeader ? { cookie: cookieHeader } : undefined });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const track = await fetchTrackServer(id);
  if (!track) return { title: "Lime" };
  const artist = track.artists.map((a) => a.name).join(", ");
  const title = `${track.name} — ${artist}`;
  const desc = `${artist}의 ${track.name} · Lime에서 평가해보세요.`;
  return {
    title: `${title} · Lime`,
    description: desc,
    openGraph: {
      title, description: desc, type: "music.song",
      images: [{ url: `/api/og/track/${id}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: desc, images: [`/api/og/track/${id}`] },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await fetchTrackServer(id);
  if (!track) notFound();
  const user = await getCurrentUser();
  const artist = track.artists.map((a) => a.name).join(", ");

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-panel/40 p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
          {track.coverUrl ? (
            <img src={track.coverUrl} className="w-48 md:w-64 aspect-square object-cover rounded-xl shadow-2xl mx-auto md:mx-0" alt="" />
          ) : (
            <div className="w-48 md:w-64 aspect-square rounded-xl bg-panel2 mx-auto md:mx-0" />
          )}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="chip">🎧 TRACK</div>
            <h1 className="text-2xl md:text-4xl font-bold">{track.name}</h1>
            <div className="text-muted">
              {artist}
              {track.albumName && (
                <> · {track.albumId ? (
                  <Link href={`/albums/${track.albumId}`} className="hover:text-fg underline-offset-2 hover:underline">{track.albumName}</Link>
                ) : (
                  <span>{track.albumName}</span>
                )}</>
              )}
              {track.releaseDate && <> · {track.releaseDate}</>}
            </div>
            {track.stats.reviewCount > 0 && (
              <div className="flex items-center gap-3 justify-center md:justify-start pt-2">
                <span className="text-5xl font-bold text-accent">{Number(track.stats.avgRating).toFixed(1)}</span>
                <div className="text-sm text-muted">
                  / 10
                  <div>{track.stats.reviewCount}개의 평가</div>
                </div>
              </div>
            )}
            <div className="pt-3 flex justify-center md:justify-start items-center gap-2 flex-wrap">
              <PlayButton
                track={{
                  id: track.id,
                  title: track.name,
                  artist,
                  coverUrl: track.coverUrl,
                  previewUrl: track.previewUrl,
                  spotifyId: track.spotifyId,
                  albumId: track.albumId,
                }}
              />
              <ShareButton title={`${track.name} — ${artist}`} path={`/tracks/${track.id}`} />
            </div>
          </div>
        </div>
        {track.coverUrl && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{
              backgroundImage: `url(${track.coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold">나의 평가</h2>
        <ReviewForm targetType="track" targetId={track.spotifyId} userId={user?.id ?? null} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold">모든 평가</h2>
        <ReviewList targetType="track" targetId={track.spotifyId} currentUserId={user?.id ?? null} />
      </section>
    </div>
  );
}
