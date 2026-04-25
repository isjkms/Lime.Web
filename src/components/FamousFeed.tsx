import Link from "next/link";
import Image from "next/image";
import FamousBadge from "./FamousBadge";
import Avatar from "./Avatar";

type FeedItem = {
  id: string;
  user_id: string;
  target_type: "track" | "album";
  target_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null } | null;
  item: { id: string; title: string; artist: string; cover_url: string | null };
};

export default function FamousFeed({
  items,
  showFamousBadge = true,
  emptyText = "아직 유명 평가자의 후기가 없어요.",
}: {
  items: FeedItem[];
  showFamousBadge?: boolean;
  emptyText?: string;
}) {
  if (!items.length) {
    return <div className="card text-muted text-sm">{emptyText}</div>;
  }
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="card flex items-start gap-3">
          <Link
            href={r.target_type === "track" ? `/tracks/${r.item.id}` : `/albums/${r.item.id}`}
            className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden"
          >
            {r.item.cover_url ? (
              <Image src={r.item.cover_url} fill sizes="56px" className="object-cover" alt="" />
            ) : (
              <div className="w-14 h-14 bg-panel2" />
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Avatar src={r.profiles?.avatar_url ?? null} seed={r.user_id} size={20} />
              <Link href={`/u/${r.user_id}`} className="text-sm font-medium hover:text-white hover:underline underline-offset-2">
                {r.profiles?.display_name ?? "익명"}
              </Link>
              {showFamousBadge && <FamousBadge />}
              <span className="text-xs text-muted">· {new Date(r.created_at).toLocaleString("ko-KR")}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-accent font-bold tabular-nums">{Number(r.rating).toFixed(1)}</span>
              <Link
                href={r.target_type === "track" ? `/tracks/${r.item.id}` : `/albums/${r.item.id}`}
                className="text-sm truncate hover:text-accent transition"
              >
                {r.item.title}
                <span className="text-muted"> — {r.item.artist}</span>
              </Link>
            </div>
            {r.comment && <p className="mt-1 text-sm text-white/90">{r.comment}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
