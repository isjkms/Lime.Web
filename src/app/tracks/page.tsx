import TrackCard from "@/components/TrackCard";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function TracksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("tracks").select("*").order("created_at", { ascending: false }).limit(60);
  if (q) query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
  const { data: tracks } = await query;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">음악</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="제목 또는 아티스트" className="input" />
        <button className="btn">검색</button>
      </form>
      {tracks?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {tracks.map((t) => <TrackCard key={t.id} track={t} />)}
        </div>
      ) : <div className="card text-muted">등록된 음악이 없어요.</div>}
    </div>
  );
}
