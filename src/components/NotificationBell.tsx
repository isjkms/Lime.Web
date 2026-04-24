"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notif = {
  id: string;
  type: "review_like" | "follow";
  data: any;
  read_at: string | null;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const unread = items.filter((n) => !n.read_at).length;

  const load = async () => {
    const { data } = await supabase.rpc("get_notifications", { p_limit: 30 });
    setItems((data ?? []) as Notif[]);
  };

  useEffect(() => {
    load();
    // Strict Mode 재마운트 시 같은 이름의 채널이 재사용되어 subscribe 이후 .on 호출이 막힘.
    // 매 마운트마다 고유 채널명을 사용.
    const uniq = `notif-${userId}-${Math.random().toString(36).slice(2, 10)}`;
    const ch = supabase.channel(uniq);
    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => load()
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await supabase.rpc("mark_notifications_read");
      // optimistic
      setItems((xs) => xs.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label="알림"
        className="relative p-1.5 rounded-full hover:bg-panel2 transition"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-panel shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold">알림</div>
          {!items.length ? (
            <div className="px-4 py-6 text-sm text-muted text-center">알림이 없어요.</div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className={!n.read_at ? "bg-panel2/40" : ""}>
                  <NotifRow n={n} onNav={() => setOpen(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotifRow({ n, onNav }: { n: Notif; onNav: () => void }) {
  const when = timeAgo(n.created_at);
  if (n.type === "review_like") {
    const href = n.data?.target_type && n.data?.target_id
      ? `/${n.data.target_type}s/${n.data.target_id}`
      : "#";
    return (
      <Link href={href} onClick={onNav} className="flex items-center gap-3 px-4 py-2.5 hover:bg-panel2">
        <Avatar src={n.actor_avatar} />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-medium">{n.actor_name ?? "누군가"}</span>
          <span className="text-muted">님이 내 후기를 좋아합니다</span>
          <div className="text-[11px] text-muted mt-0.5">{when}</div>
        </div>
        <span>👍</span>
      </Link>
    );
  }
  if (n.type === "follow" && n.actor_id) {
    return (
      <Link href={`/u/${n.actor_id}`} onClick={onNav} className="flex items-center gap-3 px-4 py-2.5 hover:bg-panel2">
        <Avatar src={n.actor_avatar} />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-medium">{n.actor_name ?? "누군가"}</span>
          <span className="text-muted">님이 팔로우했어요</span>
          <div className="text-[11px] text-muted mt-0.5">{when}</div>
        </div>
      </Link>
    );
  }
  return null;
}

function Avatar({ src }: { src: string | null }) {
  return src ? (
    <img src={src} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-panel2 shrink-0" />
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}
