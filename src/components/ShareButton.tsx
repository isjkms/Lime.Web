"use client";
import { useState } from "react";

export default function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: `Murate · ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 사용자가 공유 취소한 경우 포함 — 무시
    }
  };

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-muted hover:text-white hover:border-accent transition"
      aria-label="공유"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? "링크 복사됨" : "공유"}
    </button>
  );
}
