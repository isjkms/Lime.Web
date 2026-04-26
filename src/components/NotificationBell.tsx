"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import {
  listNotifications, getUnreadCount, markAllSeen,
  dismissNotification, clearAllNotifications, notificationStreamUrl,
  type NotificationItem,
} from "@/lib/api/notifications";

const TOAST_DURATION_MS = 5000;

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((xs) => xs.filter((t) => t.id !== id));
  }, []);

  const reload = useCallback(async () => {
    const [list, uc] = await Promise.all([listNotifications(30), getUnreadCount()]);
    setItems(list);
    setUnread(uc);
  }, []);

  useEffect(() => {
    reload();

    // SSE 구독 — 새 알림 도착 시 즉시 반영
    const es = new EventSource(notificationStreamUrl(), { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const dto = JSON.parse(e.data) as NotificationItem;
        setItems((prev) => {
          if (prev.some((x) => x.id === dto.id)) return prev;
          return [dto, ...prev].slice(0, 30);
        });
        setUnread((c) => c + 1);
        // 토스트로 잠깐 띄우고 자동 제거
        setToasts((xs) => (xs.some((t) => t.id === dto.id) ? xs : [dto, ...xs].slice(0, 4)));
        setTimeout(() => dismissToast(dto.id), TOAST_DURATION_MS);
      } catch {}
    };
    // 끊기면 브라우저가 자동 재연결. 별도 처리 불필요.

    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);

    return () => {
      es.close();
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, reload]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((xs) => xs.map((n) => (n.read ? n : { ...n, read: true })));
      try { await markAllSeen(); } catch {}
    }
  };

  const onItemClick = (n: NotificationItem) => {
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const onDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems((xs) => xs.filter((n) => n.id !== id));
    try { await dismissNotification(id); } catch {}
  };

  const onClearAll = async () => {
    setItems([]);
    setUnread(0);
    try { await clearAllNotifications(); } catch {}
  };

  const onToastClick = (n: NotificationItem) => {
    dismissToast(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={ref} className="relative">
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {toasts.map((n) => (
            <button
              key={n.id}
              onClick={() => onToastClick(n)}
              className="pointer-events-auto flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-panel/95 backdrop-blur-md shadow-2xl px-4 py-3 text-left toast-enter hover:bg-panel2 transition"
            >
              <Avatar
                src={n.actor?.avatarUrl ?? null}
                seed={n.actor?.id ?? n.id}
                size={36}
              />
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-semibold text-xs text-muted mb-0.5">Lime ♪ 알림</div>
                <div className="line-clamp-2">{n.message}</div>
              </div>
              <span
                role="button"
                aria-label="닫기"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(n.id);
                }}
                className="text-muted hover:text-white text-base leading-none px-1 -my-1 cursor-pointer"
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}

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
          <div className="px-4 py-3 border-b border-border flex items-center justify-between text-sm">
            <span className="font-semibold">알림</span>
            {items.length > 0 && (
              <button onClick={onClearAll} className="text-xs text-muted hover:text-red-400">
                모두 비우기
              </button>
            )}
          </div>
          {!items.length ? (
            <div className="px-4 py-6 text-sm text-muted text-center">알림이 없어요.</div>
          ) : (
            <ul>
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-panel2 ${
                    n.read ? "opacity-60" : "bg-panel2/40"
                  }`}
                >
                  <Avatar
                    src={n.actor?.avatarUrl ?? null}
                    seed={n.actor?.id ?? n.id}
                    size={32}
                  />
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="truncate">{n.message}</div>
                    <div className="text-[11px] text-muted mt-0.5">{timeAgo(n.createdAt)}</div>
                  </div>
                  <button
                    onClick={(e) => onDismiss(e, n.id)}
                    aria-label="알림 닫기"
                    className="text-muted hover:text-white text-base leading-none px-1 -my-1"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}
