"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth-client";
import Avatar from "./Avatar";

export default function UserMenu({
  userId, name, avatarUrl, points, isAdmin = false,
}: { userId: string; name: string; avatarUrl: string | null; points: number; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-panel2 transition"
      >
        <Avatar src={avatarUrl} seed={userId} size={28} />
        <span className="hidden sm:inline text-xs text-muted max-w-[7rem] truncate">{name}</span>
        <span className="px-1.5 py-0.5 rounded-full bg-panel2 border border-border text-[10px] whitespace-nowrap">
          <span className="text-accent font-semibold">{points}</span>P
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-panel shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-xs text-muted mt-0.5">{points}P 보유</div>
          </div>
          <Link href="/me" onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-panel2 text-sm">
            내 프로필
          </Link>
          <Link href="/me/settings" onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-panel2 text-sm">
            설정
          </Link>
          {isAdmin && (
            <Link href="/admin/reports" onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-panel2 text-sm text-amber">
              🛡 신고 관리
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2.5 hover:bg-panel2 text-sm text-red-400 border-t border-border"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
