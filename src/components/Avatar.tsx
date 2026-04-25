// 사용자 아바타. avatarUrl이 있으면 이미지를, 없으면
// 사용자 id 기반 deterministic 배경색 + 라임 단면 SVG로 폴백.
const PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a16207", // amber-700
  "#7c3aed", // purple
];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Avatar({
  src,
  seed,
  size = 40,
  className = "",
  alt = "",
}: {
  src?: string | null;
  seed: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const cls = `rounded-full object-cover shrink-0 ${className}`;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} width={size} height={size} className={cls} style={{ width: size, height: size }} />
    );
  }
  const bg = pickColor(seed || "anon");
  return (
    <div
      aria-hidden={!alt}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      className={`rounded-full shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size, background: bg }}
    >
      <LimeSlice size={Math.round(size * 0.7)} />
    </div>
  );
}

// 라임 단면 (cross-section) — 8조각 과육 + 외곽 껍질
function LimeSlice({ size }: { size: number }) {
  const r = 50;
  const wedges = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="-60 -60 120 120">
      {/* 외피 (어두운 초록) */}
      <circle cx={0} cy={0} r={r + 6} fill="#365314" />
      {/* 흰 속껍질 */}
      <circle cx={0} cy={0} r={r + 1} fill="#f7fee7" />
      {/* 과육 영역 */}
      <circle cx={0} cy={0} r={r - 4} fill="#bef264" />
      {/* 과육 격벽 (흰 선) */}
      {wedges.map((deg) => (
        <line
          key={deg}
          x1={0}
          y1={0}
          x2={(r - 4) * Math.cos((deg * Math.PI) / 180)}
          y2={(r - 4) * Math.sin((deg * Math.PI) / 180)}
          stroke="#f7fee7"
          strokeWidth={4}
          strokeLinecap="round"
        />
      ))}
      {/* 중심 점 */}
      <circle cx={0} cy={0} r={4} fill="#f7fee7" />
    </svg>
  );
}
