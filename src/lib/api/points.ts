const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiUrl = (p: string) => `${API_BASE.replace(/\/$/, "")}${p}`;

export type PointTx = {
  id: string;
  delta: number;
  reason: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
};

export type PointsResponse = {
  balance: number;
  transactions: PointTx[];
};

export async function getMyPoints(
  init?: RequestInit,
  limit = 50,
): Promise<PointsResponse> {
  const res = await fetch(apiUrl(`/users/me/points?limit=${limit}`), {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  if (!res.ok) return { balance: 0, transactions: [] };
  return res.json();
}

export const POINTS = {
  welcomeBonus: 10,
  reviewCreated: 5,
  likeReceived: 1,
  reviewEdit: 30,
  reviewDelete: 50,
  nicknameChange: 300,
  graceMinutes: 5,
} as const;
