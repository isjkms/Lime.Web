"use client";

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

export function apiUrl(path: string) {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(apiUrl("/auth/me"), {
      credentials: "include",
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

export async function signOut() {
  await fetch(apiUrl("/auth/signout"), {
    method: "POST",
    credentials: "include",
  });
}

export function loginUrl(provider: "google" | "kakao" | "naver", returnTo = "/") {
  const qs = new URLSearchParams({ returnTo });
  return apiUrl(`/auth/${provider}/start?${qs.toString()}`);
}

export async function getSpotifyToken(): Promise<string | null> {
  try {
    const res = await fetch(apiUrl("/spotify/user-token"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.token ?? null;
  } catch {
    return null;
  }
}

export function spotifyConnectUrl(returnTo?: string) {
  const path = "/spotify/connect/start";
  if (!returnTo) return apiUrl(path);
  const qs = new URLSearchParams({ returnTo });
  return apiUrl(`${path}?${qs.toString()}`);
}


export async function disconnectSpotify() {
  await fetch(apiUrl("/spotify/disconnect"), {
    method: "POST",
    credentials: "include",
  });
}
