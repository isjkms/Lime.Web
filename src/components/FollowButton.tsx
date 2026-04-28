"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { follow, unfollow } from "@/lib/api/social";

export default function FollowButton({
  targetId,
  loggedIn,
  initiallyFollowing,
  size = "md",
}: {
  targetId: string;
  loggedIn: boolean;
  initiallyFollowing: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!loggedIn) { router.push("/login"); return; }
    if (following && !confirm("팔로우를 끊을까요?")) return;
    setBusy(true);
    try {
      if (following) {
        await unfollow(targetId);
        setFollowing(false);
      } else {
        await follow(targetId);
        setFollowing(true);
      }
      router.refresh();
    } catch (err: any) {
      const msg = err?.message ?? "실패";
      if (msg !== "self_follow") alert(msg);
    } finally {
      setBusy(false);
    }
  };

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm";
  const cls = following
    ? `rounded-full border border-border text-muted hover:text-fg hover:border-red-400/60 ${pad}`
    : `rounded-full font-semibold ${pad}`;
  const style = following ? undefined : { background: "linear-gradient(135deg, #bef264, #facc15)", color: "white" };

  return (
    <button onClick={toggle} disabled={busy} className={cls} style={style}>
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
