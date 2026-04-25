import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import FamousBadge from "@/components/FamousBadge";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { getCurrentUser } from "@/lib/auth";
import { getUser } from "@/lib/api/users";
import { listUserReviews } from "@/lib/api/reviews";

export const revalidate = 0;

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const init = cookieHeader ? { headers: { cookie: cookieHeader } } : undefined;

  const [profile, viewer] = await Promise.all([
    getUser(id, init),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const reviewsPage = await listUserReviews(profile.id, { pageSize: 50 }, init);

  const famous = profile.reviewCount >= 1000 && profile.likesReceived >= 1000;
  const isMe = viewer?.id === profile.id;

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-4">
        <Avatar src={profile.avatarUrl} seed={profile.id} size={80} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{profile.displayName}</h1>
            {famous && <FamousBadge />}
          </div>
          <div className="text-xs text-muted mt-1">
            가입 {new Date(profile.createdAt).toLocaleDateString("ko-KR")}
          </div>
          <div className="flex gap-4 text-sm mt-2 flex-wrap">
            <span><b>{profile.reviewCount}</b> <span className="text-muted">평가</span></span>
            <Link href={`/u/${profile.id}/followers`} className="hover:text-white">
              <b>{profile.followersCount}</b> <span className="text-muted">팔로워</span>
            </Link>
            <Link href={`/u/${profile.id}/following`} className="hover:text-white">
              <b>{profile.followingCount}</b> <span className="text-muted">팔로잉</span>
            </Link>
            <span><b>{profile.likesReceived}</b> <span className="text-muted">좋아요</span></span>
          </div>
        </div>
        {!isMe && (
          <FollowButton
            targetId={profile.id}
            loggedIn={!!viewer}
            initiallyFollowing={profile.isFollowing}
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
        {!reviewsPage.items.length ? (
          <div className="card text-muted">아직 평가가 없어요.</div>
        ) : (
          <ul className="space-y-2">
            {reviewsPage.items.map((r) => {
              const meta = r.target === "track" ? r.track : r.album;
              const href = meta ? `/${r.target === "track" ? "tracks" : "albums"}/${meta.id}` : "#";
              const artist = (meta?.artists ?? []).map((a) => a.name).join(", ");
              return (
                <li key={r.id} className="card">
                  <Link href={href} className="flex gap-3 items-center hover:text-white">
                    {meta?.coverUrl ? (
                      <img src={meta.coverUrl} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-panel2" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-accent font-bold">{Number(r.rating).toFixed(1)}</span>
                        <span className="text-sm truncate">{meta?.name ?? "(삭제된 대상)"}</span>
                      </div>
                      <div className="text-xs text-muted truncate">
                        {artist} · {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                      {r.body && <p className="text-sm mt-1 line-clamp-2">{r.body}</p>}
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
