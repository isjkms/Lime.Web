import Link from "next/link";
import PlayButton from "./PlayButton";

type Track = {
  id: string;
  title: string;
  artist: string;
  cover_url?: string | null;
  preview_url?: string | null;
  spotify_id?: string | null;
  album_id?: string | null;
  avg?: number;
  n?: number;
};

export default function TrackCard({ track, href = `/tracks/${track.id}` }: { track: Track; href?: string }) {
  return (
    <div className="card space-y-3 hover:border-accent/60 transition group">
      <Link href={href} className="block relative overflow-hidden rounded-lg">
        {track.cover_url ? (
          <img src={track.cover_url} alt="" className="w-full aspect-square object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="w-full aspect-square bg-panel2 flex items-center justify-center text-muted text-4xl">♪</div>
        )}
        {typeof track.avg === "number" && track.n ? (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-xs">
            <span className="text-accent font-bold">{track.avg.toFixed(1)}</span>
          </div>
        ) : null}
      </Link>
      <div className="min-w-0">
        <Link href={href} className="font-medium line-clamp-1 hover:text-accent text-sm md:text-base">
          {track.title}
        </Link>
        <div className="text-xs md:text-sm text-muted line-clamp-1">{track.artist}</div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {track.n ? `${track.n}개 평가` : "평가 없음"}
        </span>
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
      </div>
    </div>
  );
}
