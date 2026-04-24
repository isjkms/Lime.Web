import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type Bucket = { label: string; min: number; max: number };
const BUCKETS: Bucket[] = [
  { label: "⭐ 9 ~ 10", min: 9, max: 10 },
  { label: "8 ~ 8.9", min: 8, max: 8.99 },
  { label: "7 ~ 7.9", min: 7, max: 7.99 },
  { label: "6 ~ 6.9", min: 6, max: 6.99 },
];

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const type = sp.type === "album" ? "album" : "track";
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles").select("id, display_name").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, target_id")
    .eq("user_id", id)
    .eq("target_type", type)
    .gte("rating", 6)
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const ids = (reviews ?? []).map((r: any) => r.target_id);
  const table = type === "track" ? "tracks" : "albums";
  const { data: items } = ids.length
    ? await supabase.from(table).select("id, title, artist, cover_url").in("id", ids)
    : { data: [] as any[] };
  const meta = new Map((items ?? []).map((t: any) => [t.id, t]));

  const rows = (reviews ?? [])
    .map((r: any) => ({ rating: Number(r.rating), ...meta.get(r.target_id) }))
    .filter((x: any) => x.id);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}의 컬렉션</h1>
          <p className="text-sm text-muted mt-1">6점 이상 평가만 모았어요.</p>
        </div>
        <div className="inline-flex rounded-full border border-border overflow-hidden text-sm">
          <TabLink href={`/u/${id}/collection?type=track`} active={type === "track"}>🎧 곡</TabLink>
          <TabLink href={`/u/${id}/collection?type=album`} active={type === "album"}>💿 앨범</TabLink>
        </div>
      </div>

      <div className="text-sm">
        <Link href={`/u/${id}`} className="text-muted hover:text-white">← 프로필로</Link>
      </div>

      {!rows.length ? (
        <div className="card text-muted">6점 이상의 평가가 아직 없어요.</div>
      ) : (
        <div className="space-y-8">
          {BUCKETS.map((b) => {
            const inBucket = rows.filter((r: any) => r.rating >= b.min && r.rating <= b.max);
            if (!inBucket.length) return null;
            return (
              <section key={b.label} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-semibold">{b.label}</h2>
                  <span className="text-xs text-muted">{inBucket.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {inBucket.map((r: any) => (
                    <Link key={r.id} href={`/${type}s/${r.id}`} className="card p-2 hover:border-accent transition group">
                      <div className="relative">
                        {r.cover_url ? (
                          <img src={r.cover_url} className="w-full aspect-square object-cover rounded-md group-hover:scale-[1.02] transition" alt="" />
                        ) : (
                          <div className="w-full aspect-square rounded-md bg-panel2" />
                        )}
                        <span className="absolute top-1.5 right-1.5 chip text-[10px] bg-panel/90 backdrop-blur">
                          <span className="text-accent font-bold">{r.rating.toFixed(1)}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-medium line-clamp-1">{r.title}</div>
                      <div className="text-xs text-muted line-clamp-1">{r.artist}</div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabLink({
  href, active, children,
}: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 transition ${active ? "text-white" : "text-muted hover:text-white"}`}
      style={active ? { background: "linear-gradient(135deg, #ff5c8a, #a78bfa)" } : undefined}
    >
      {children}
    </Link>
  );
}
