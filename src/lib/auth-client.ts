"use client";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
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
