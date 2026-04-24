import AlbumCard from "@/components/AlbumCard";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function AlbumsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("albums").select("*").order("created_at", { ascending: false }).limit(60);
  if (q) query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
  const { data: albums } = await query;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">앨범</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="제목 또는 아티스트" className="input" />
        <button className="btn">검색</button>
      </form>
      {albums?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {albums.map((a) => <AlbumCard key={a.id} album={a} />)}
        </div>
      ) : <div className="card text-muted">등록된 앨범이 없어요.</div>}
    </div>
  );
}
