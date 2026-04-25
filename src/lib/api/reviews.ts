const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
function apiUrl(path: string) {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

export type ReviewUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  reviewCount: number;
  likesReceived: number;
};

export type ReviewItem = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: ReviewUser;
  target: "track" | "album";
  track: { id: string; spotifyId: string; name: string; albumId: string | null; coverUrl: string | null; artists: { spotifyId: string; name: string }[] } | null;
  album: { id: string; spotifyId: string; name: string; coverUrl: string | null; artists: { spotifyId: string; name: string }[] } | null;
  likes: number;
  dislikes: number;
  myReaction: "like" | "dislike" | null;
};

export type ReviewPage = {
  total: number;
  page: number;
  pageSize: number;
  items: ReviewItem[];
};

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const d = await res.json(); msg = d.error ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function listReviews(
  target: "track" | "album", spotifyId: string,
  opts: { sort?: "recent" | "top"; page?: number; pageSize?: number } = {}
): Promise<ReviewPage> {
  const qs = new URLSearchParams({
    target, spotifyId,
    sort: opts.sort ?? "recent",
    page: String(opts.page ?? 1),
    pageSize: String(opts.pageSize ?? 20),
  });
  const res = await fetch(apiUrl(`/reviews?${qs}`), { credentials: "include", cache: "no-store" });
  return j<ReviewPage>(res);
}

export async function listUserReviews(
  userId: string,
  opts: { sort?: "recent" | "top"; page?: number; pageSize?: number } = {},
  init?: RequestInit,
): Promise<ReviewPage> {
  const qs = new URLSearchParams({
    sort: opts.sort ?? "recent",
    page: String(opts.page ?? 1),
    pageSize: String(opts.pageSize ?? 20),
  });
  const res = await fetch(apiUrl(`/users/${userId}/reviews?${qs}`), {
    credentials: "include", cache: "no-store", ...init,
  });
  return j<ReviewPage>(res);
}

export async function feedReviews(
  opts: { sort?: "recent" | "top"; page?: number; pageSize?: number } = {}
): Promise<ReviewPage> {
  const qs = new URLSearchParams({
    sort: opts.sort ?? "recent",
    page: String(opts.page ?? 1),
    pageSize: String(opts.pageSize ?? 20),
  });
  const res = await fetch(apiUrl(`/reviews/feed?${qs}`), { credentials: "include", cache: "no-store" });
  return j<ReviewPage>(res);
}

export async function upsertReview(input: {
  target: "track" | "album"; spotifyId: string; rating: number; body: string;
}): Promise<{ id: string }> {
  const res = await fetch(apiUrl("/reviews"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return j<{ id: string }>(res);
}

export async function updateReview(id: string, input: { rating?: number; body?: string }): Promise<void> {
  const res = await fetch(apiUrl(`/reviews/${id}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await errorText(res));
}

export async function deleteReview(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/reviews/${id}`), { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(await errorText(res));
}

export async function reactReview(id: string, kind: "like" | "dislike"): Promise<void> {
  const res = await fetch(apiUrl(`/reviews/${id}/reactions`), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  if (!res.ok) throw new Error(await errorText(res));
}

export async function unreactReview(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/reviews/${id}/reactions`), { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(await errorText(res));
}

async function errorText(res: Response): Promise<string> {
  try { const d = await res.json(); return d.error ?? `${res.status}`; } catch { return `${res.status}`; }
}
