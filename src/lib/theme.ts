"use client";

export type ThemeMode = "light" | "dark" | "auto";
export const THEME_KEY = "lime.theme";

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {}
  return "auto";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark", "dark");
  root.classList.add(`theme-${resolved}`);
  // Tailwind dark: variant 호환
  if (resolved === "dark") root.classList.add("dark");
}

export function setTheme(mode: ThemeMode) {
  try { localStorage.setItem(THEME_KEY, mode); } catch {}
  applyTheme(mode);
}
