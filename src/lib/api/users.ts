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
