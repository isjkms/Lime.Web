import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import PlayButton from "@/components/PlayButton";
import ShareButton from "@/components/ShareButton";
import Link from "next/link";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase.from("tracks").select("title, artist").eq("id", id).maybeSingle();
  if (!t) return { title: "Murate" };
  const title = `${t.title} — ${t.artist}`;
  const desc = `${t.artist}의 ${t.title} · Murate에서 평가해보세요.`;
  return {
    title: `${title} · Murate`,
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
  const supabase = await createClient();
  const { data: track } = await supabase.from("tracks").select("*").eq("id", id).maybeSingle();
  if (!track) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: stats } = await supabase.from("track_stats").select("*").eq("track_id", id).maybeSingle();

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-panel/40 p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
          {track.cover_url ? (
            <img src={track.cover_url} className="w-48 md:w-64 aspect-square object-cover rounded-xl shadow-2xl mx-auto md:mx-0" alt="" />
          ) : (
            <div className="w-48 md:w-64 aspect-square rounded-xl bg-panel2 mx-auto md:mx-0" />
          )}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="chip">🎧 TRACK</div>
            <h1 className="text-2xl md:text-4xl font-bold">{track.title}</h1>
            <div className="text-muted">
              {track.artist}
              {track.album_name && (
                <> · {track.album_id ? (
                  <Link href={`/albums/${track.album_id}`} className="hover:text-white underline-offset-2 hover:underline">{track.album_name}</Link>
                ) : (
                  <Link href={`/search?q=${encodeURIComponent(track.album_name)}`} className="hover:text-white">{track.album_name}</Link>
                )}</>
              )}
              {track.release_date && <> · {track.release_date}</>}
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
            <div className="pt-3 flex justify-center md:justify-start items-center gap-2 flex-wrap">
              <PlayButton
                track={{
                  id: track.id,
                  title: track.title,
                  artist: track.artist,
                  coverUrl: track.cover_url,
                  previewUrl: track.preview_url,
                  spotifyId: track.spotify_id,
                  albumId: track.album_id,
                }}
              />
              <ShareButton title={`${track.title} — ${track.artist}`} path={`/tracks/${track.id}`} />
            </div>
          </div>
        </div>
        {track.cover_url && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{
              backgroundImage: `url(${track.cover_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold">나의 평가</h2>
        <ReviewForm targetType="track" targetId={track.id} userId={user?.id ?? null} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold">모든 평가</h2>
        <ReviewList targetType="track" targetId={track.id} currentUserId={user?.id ?? null} />
      </section>
    </div>
  );
}
