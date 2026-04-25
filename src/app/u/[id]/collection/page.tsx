import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getUser } from "@/lib/api/users";
import { listUserReviews } from "@/lib/api/reviews";

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

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const init = cookieHeader ? { headers: { cookie: cookieHeader } } : undefined;

  const profile = await getUser(id, init);
  if (!profile) notFound();

  const page = await listUserReviews(profile.id, { pageSize: 50, sort: "recent" }, init);

  const rows = page.items
    .filter((r) => r.target === type && Number(r.rating) >= 6)
    .map((r) => {
      const meta = type === "track" ? r.track : r.album;
      if (!meta) return null;
      return {
        id: meta.id,
        title: meta.name,
        artist: (meta.artists ?? []).map((a) => a.name).join(", "),
        cover_url: meta.coverUrl,
        rating: Number(r.rating),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}의 컬렉션</h1>
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
            const inBucket = rows.filter((r) => r.rating >= b.min && r.rating <= b.max);
            if (!inBucket.length) return null;
            return (
              <section key={b.label} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-semibold">{b.label}</h2>
                  <span className="text-xs text-muted">{inBucket.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {inBucket.map((r) => (
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
