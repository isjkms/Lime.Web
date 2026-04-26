import { cookies } from "next/headers";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  points: number;
  nicknameChanges: number;
  createdAt: string | null;
  providers: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

export async function getSpotifyToken(): Promise<string | null> {
  if (!API_BASE) return null;
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await fetch(apiUrl("/spotify/user-token"), {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.token ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!API_BASE) return null;
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const res = await fetch(apiUrl("/auth/me"), {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      email: data.email ?? null,
      name: data.name ?? null,
      avatarUrl: data.avatarUrl ?? null,
      bio: data.bio ?? null,
      points: typeof data.points === "number" ? data.points : 0,
      nicknameChanges: typeof data.nicknameChanges === "number" ? data.nicknameChanges : 0,
      createdAt: data.createdAt ?? null,
      providers: Array.isArray(data.providers) ? data.providers : [],
    };
  } catch {
    return null;
  }
}
