"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!loggedIn) { router.push("/login"); return; }
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/login"); setBusy(false); return; }
    if (following) {
      const { error } = await supabase.from("follows")
        .delete().match({ follower_id: auth.user.id, followee_id: targetId });
      if (!error) setFollowing(false);
      else alert(error.message);
    } else {
      const { error } = await supabase.from("follows")
        .insert({ follower_id: auth.user.id, followee_id: targetId });
      if (!error) setFollowing(true);
      else if (error.code !== "23505") alert(error.message);
      else setFollowing(true);
    }
    setBusy(false);
    router.refresh();
  };

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm";
  const cls = following
    ? `rounded-full border border-border text-muted hover:text-white hover:border-red-400/60 ${pad}`
    : `rounded-full font-semibold ${pad}`;
  const style = following ? undefined : { background: "linear-gradient(135deg, #ff5c8a, #a78bfa)", color: "white" };

  return (
    <button onClick={toggle} disabled={busy} className={cls} style={style}>
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
