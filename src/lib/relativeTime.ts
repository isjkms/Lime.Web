// 한국어 상대시각 — "방금", "5분 전", "어제", "3일 전", "4달 전", "1년 전" 등.
export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, (now.getTime() - t) / 1000); // seconds

  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 2) return "어제";
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400 / 7)}주 전`;
  if (diff < 86400 * 365) return `${Math.floor(diff / 86400 / 30)}달 전`;
  return `${Math.floor(diff / 86400 / 365)}년 전`;
}
