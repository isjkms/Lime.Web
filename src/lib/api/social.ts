const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiUrl = (path: string) => `${API_BASE.replace(/\/$/, "")}${path}`;

export type FollowUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followedAt: string;
  isFollowing: boolean;
};

export type FollowPage = {
  total: number;
  page: number;
  pageSize: number;
  items: FollowUser[];
};

export async function follow(userId: string): Promise<void> {
  const res = await fetch(apiUrl(`/users/${userId}/follow`), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await errorText(res));
}

export async function unfollow(userId: string): Promise<void> {
  const res = await fetch(apiUrl(`/users/${userId}/follow`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await errorText(res));
}

export async function getFollowers(
  userId: string,
  opts: { page?: number; pageSize?: number } = {},
  init?: RequestInit,
): Promise<FollowPage> {
  const qs = new URLSearchParams();
  if (opts.page) qs.set("page", String(opts.page));
  if (opts.pageSize) qs.set("pageSize", String(opts.pageSize));
  const res = await fetch(apiUrl(`/users/${userId}/followers?${qs}`), {
    credentials: "include", cache: "no-store", ...init,
  });
  if (!res.ok) return { total: 0, page: 1, pageSize: 30, items: [] };
  return res.json();
}

export async function getFollowing(
  userId: string,
  opts: { page?: number; pageSize?: number } = {},
  init?: RequestInit,
): Promise<FollowPage> {
  const qs = new URLSearchParams();
  if (opts.page) qs.set("page", String(opts.page));
  if (opts.pageSize) qs.set("pageSize", String(opts.pageSize));
  const res = await fetch(apiUrl(`/users/${userId}/following?${qs}`), {
    credentials: "include", cache: "no-store", ...init,
  });
  if (!res.ok) return { total: 0, page: 1, pageSize: 30, items: [] };
  return res.json();
}

async function errorText(res: Response) {
  try { const d = await res.json(); return d.error ?? `${res.status}`; } catch { return `${res.status}`; }
}
