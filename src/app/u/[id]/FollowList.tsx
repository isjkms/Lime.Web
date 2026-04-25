import Link from "next/link";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { getCurrentUser } from "@/lib/auth";
import type { FollowUser } from "@/lib/api/social";

export default async function FollowList({
  title,
  backHref,
  total,
  items,
}: {
  title: string;
  backHref: string;
  total: number;
  items: FollowUser[];
  currentUserId: string | null;
}) {
  const viewer = await getCurrentUser();

  return (
    <div className="space-y-4">
      <div>
        <Link href={backHref} className="text-sm text-muted hover:text-white">← 프로필로</Link>
        <h1 className="text-2xl font-bold mt-2">{title}</h1>
        <p className="text-sm text-muted mt-1">총 {total}명</p>
      </div>

      {items.length === 0 ? (
        <div className="card text-muted">아직 없어요.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((u) => {
            const isMe = viewer?.id === u.id;
            return (
              <li key={u.id} className="card flex items-center gap-3">
                <Link href={`/u/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:text-white">
                  <Avatar src={u.avatarUrl} seed={u.id} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.displayName}</div>
                    <div className="text-xs text-muted">팔로우 {new Date(u.followedAt).toLocaleDateString("ko-KR")}</div>
                  </div>
                </Link>
                {!isMe && (
                  <FollowButton
                    targetId={u.id}
                    loggedIn={!!viewer}
                    initiallyFollowing={u.isFollowing}
                    size="sm"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
