const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiUrl = (p: string) => `${API_BASE.replace(/\/$/, "")}${p}`;

export type NotificationItem = {
  id: string;
  kind: "NewFollower" | "ReviewLiked" | string;
  actor: { id: string; displayName: string; avatarUrl: string | null } | null;
  link: string | null;
  message: string;
  read: boolean;
  createdAt: string;
};

export async function listNotifications(limit = 30): Promise<NotificationItem[]> {
  const res = await fetch(apiUrl(`/notifications?limit=${limit}`), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetch(apiUrl("/notifications/unread-count"), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const d = await res.json();
  return d.count ?? 0;
}

export async function markAllSeen(): Promise<void> {
  await fetch(apiUrl("/notifications/seen"), {
    method: "POST",
    credentials: "include",
  });
}

export async function dismissNotification(id: string): Promise<void> {
  await fetch(apiUrl(`/notifications/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
}

export async function clearAllNotifications(): Promise<void> {
  await fetch(apiUrl("/notifications"), {
    method: "DELETE",
    credentials: "include",
  });
}

export function notificationStreamUrl() {
  return apiUrl("/notifications/stream");
}
