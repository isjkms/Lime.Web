import AlbumCard from "@/components/AlbumCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiUrl = (path: string) => `${API_BASE.replace(/\/$/, "")}${path}`;

export const revalidate = 0;

type ApiAlbum = {
  id: string;
  spotifyId: string;
  name: string;
  coverUrl: string | null;
  releaseDate: string | null;
  artists: { spotifyId: string; name: string }[];
  avg: number;
  n: number;
};

export default async function AlbumsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const qs = new URLSearchParams({ limit: "60" });
  if (q) qs.set("q", q);

  let albums: ApiAlbum[] = [];
  try {
    const res = await fetch(apiUrl(`/catalog/albums?${qs}`), { cache: "no-store" });
    if (res.ok) albums = await res.json();
  } catch {}

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">앨범</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="제목" className="input" />
        <button className="btn">검색</button>
      </form>
      {albums.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {albums.map((a) => (
            <AlbumCard
              key={a.id}
              album={{
                id: a.id,
                title: a.name,
                artist: a.artists.map((x) => x.name).join(", "),
                cover_url: a.coverUrl,
                avg: a.avg,
                n: a.n,
              }}
            />
          ))}
        </div>
      ) : <div className="card text-muted">등록된 앨범이 없어요.</div>}
    </div>
  );
}
