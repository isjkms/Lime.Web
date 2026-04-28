// 라임 단면 SVG 마크. 헤더/로고/빈 아바타에 공통 사용.
// 외피 → 흰 속껍질 → 과육(라임그린) → 흰 격벽 8조각 → 중심 점.
export default function LimeMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  const r = 50;
  const wedges = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-60 -60 120 120"
      className={className}
      aria-hidden="true"
    >
      <circle cx={0} cy={0} r={r + 6} fill="#365314" />
      <circle cx={0} cy={0} r={r + 1} fill="#f7fee7" />
      <circle cx={0} cy={0} r={r - 4} fill="#bef264" />
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
      <circle cx={0} cy={0} r={4} fill="#f7fee7" />
    </svg>
  );
}
