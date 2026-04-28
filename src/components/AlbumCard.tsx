import Link from "next/link";

type Album = {
  id: string;
  title: string;
  artist: string;
  cover_url?: string | null;
  avg?: number;
  n?: number;
  last_review_at?: string;
};

function hm(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `어제 ${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export default function AlbumCard({ album }: { album: Album }) {
  return (
    <Link href={`/albums/${album.id}`} className="card block hover:border-accent/60 transition group space-y-2">
      <div className="relative overflow-hidden rounded-xl">
        {album.cover_url ? (
          <img src={album.cover_url} alt="" className="w-full aspect-square object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="w-full aspect-square bg-panel2 flex items-center justify-center text-muted text-4xl">💿</div>
        )}
        {typeof album.avg === "number" && album.n ? (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-xs">
            <span className="text-accent font-bold">{album.avg.toFixed(1)}</span>
          </div>
        ) : null}
        {album.last_review_at && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] tabular-nums text-fg/90">
            {hm(album.last_review_at)}
          </div>
        )}
      </div>
      <div>
        <div className="font-medium line-clamp-1 text-sm md:text-base group-hover:text-accent transition">{album.title}</div>
        <div className="text-xs md:text-sm text-muted line-clamp-1">{album.artist}</div>
      </div>
    </Link>
  );
}
