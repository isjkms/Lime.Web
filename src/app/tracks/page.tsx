import TrackCard from "@/components/TrackCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiUrl = (path: string) => `${API_BASE.replace(/\/$/, "")}${path}`;

export const revalidate = 0;

type ApiTrack = {
  id: string;
  spotifyId: string;
  name: string;
  previewUrl: string | null;
  albumId: string | null;
  coverUrl: string | null;
  artists: { spotifyId: string; name: string }[];
  avg: number;
  n: number;
};

export default async function TracksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const qs = new URLSearchParams({ limit: "60" });
  if (q) qs.set("q", q);

  let tracks: ApiTrack[] = [];
  try {
    const res = await fetch(apiUrl(`/catalog/tracks?${qs}`), { cache: "no-store" });
    if (res.ok) tracks = await res.json();
  } catch {}

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">음악</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="제목" className="input" />
        <button className="btn">검색</button>
      </form>
      {tracks.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {tracks.map((t) => (
            <TrackCard
              key={t.id}
              track={{
                id: t.id,
                title: t.name,
                artist: t.artists.map((a) => a.name).join(", "),
                cover_url: t.coverUrl,
                preview_url: t.previewUrl,
                spotify_id: t.spotifyId,
                album_id: t.albumId,
                avg: t.avg,
                n: t.n,
              }}
            />
          ))}
        </div>
      ) : <div className="card text-muted">등록된 음악이 없어요.</div>}
    </div>
  );
}
