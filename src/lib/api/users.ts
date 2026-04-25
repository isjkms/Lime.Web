const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
function apiUrl(path: string) {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

export type UserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  reviewCount: number;
  likesReceived: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export type LeaderboardRow = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  reviewCount: number;
  likesReceived: number;
};

export async function getUser(id: string, init?: RequestInit): Promise<UserProfile | null> {
  const res = await fetch(apiUrl(`/users/${id}`), { cache: "no-store", ...init });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function updateMe(input: {
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
}): Promise<void> {
  const res = await fetch(apiUrl("/users/me"), {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const d = await res.json(); msg = d.error ?? msg; } catch {}
    throw new Error(msg);
  }
}

export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(apiUrl("/users/me/avatar"), {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const d = await res.json(); msg = d.error ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteMe(): Promise<void> {
  const res = await fetch(apiUrl("/users/me"), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status}`);
}

export async function getLeaderboard(
  sort: "likes" | "count",
  limit = 100,
  init?: RequestInit,
): Promise<LeaderboardRow[]> {
  const res = await fetch(
    apiUrl(`/users/leaderboard?sort=${sort}&limit=${limit}`),
    { cache: "no-store", ...init },
  );
  if (!res.ok) return [];
  return res.json();
}
