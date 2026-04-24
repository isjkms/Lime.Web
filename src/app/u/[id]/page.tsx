import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import FamousBadge from "@/components/FamousBadge";
import FollowButton from "@/components/FollowButton";

export const revalidate = 0;

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, review_count, likes_received, followers_count, following_count, created_at")
    .eq("id", id).maybeSingle();
  if (!profile) notFound();

  const user = await getCurrentUser();
  const isMe = user?.id === profile.id;

  let initiallyFollowing = false;
  if (user && !isMe) {
    const { data: f } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("followee_id", profile.id)
      .maybeSingle();
    initiallyFollowing = !!f;
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, target_type, target_id")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // 대상 메타 (tracks/albums join)
  const trackIds = (reviews ?? []).filter((r) => r.target_type === "track").map((r) => r.target_id);
  const albumIds = (reviews ?? []).filter((r) => r.target_type === "album").map((r) => r.target_id);
  const [{ data: tracks }, { data: albums }] = await Promise.all([
    trackIds.length
      ? supabase.from("tracks").select("id, title, artist, cover_url").in("id", trackIds)
      : Promise.resolve({ data: [] as any[] }),
    albumIds.length
      ? supabase.from("albums").select("id, title, artist, cover_url").in("id", albumIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const tMap = new Map((tracks ?? []).map((t: any) => [t.id, t]));
  const aMap = new Map((albums ?? []).map((a: any) => [a.id, a]));

  const famous = (profile.review_count ?? 0) >= 1000 && (profile.likes_received ?? 0) >= 1000;

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-panel2" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{profile.display_name}</h1>
            {famous && <FamousBadge />}
          </div>
          <div className="text-xs text-muted mt-1">
            가입 {new Date(profile.created_at).toLocaleDateString("ko-KR")}
          </div>
          <div className="flex gap-4 text-sm mt-2">
            <span><b>{profile.review_count ?? 0}</b> <span className="text-muted">평가</span></span>
            <span><b>{profile.followers_count ?? 0}</b> <span className="text-muted">팔로워</span></span>
            <span><b>{profile.following_count ?? 0}</b> <span className="text-muted">팔로잉</span></span>
            <span><b>{profile.likes_received ?? 0}</b> <span className="text-muted">좋아요</span></span>
          </div>
        </div>
        {!isMe && (
          <FollowButton
            targetId={profile.id}
            loggedIn={!!user}
            initiallyFollowing={initiallyFollowing}
          />
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 평가</h2>
          <Link href={`/u/${profile.id}/collection`} className="text-sm text-muted hover:text-white">
            🎵 컬렉션 보기 →
          </Link>
        </div>
        {!reviews?.length ? (
          <div className="card text-muted">아직 평가가 없어요.</div>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r: any) => {
              const meta = r.target_type === "track" ? tMap.get(r.target_id) : aMap.get(r.target_id);
              const href = `/${r.target_type}s/${r.target_id}`;
              return (
                <li key={r.id} className="card">
                  <Link href={href} className="flex gap-3 items-center hover:text-white">
                    {meta?.cover_url ? (
                      <img src={meta.cover_url} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-panel2" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-accent font-bold">{Number(r.rating).toFixed(1)}</span>
                        <span className="text-sm truncate">{meta?.title ?? "(삭제된 대상)"}</span>
                      </div>
                      <div className="text-xs text-muted truncate">
                        {meta?.artist} · {new Date(r.created_at).toLocaleDateString("ko-KR")}
                      </div>
                      {r.comment && <p className="text-sm mt-1 line-clamp-2">{r.comment}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
