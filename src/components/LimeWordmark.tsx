// Lime 워드마크 — public/icon/lime icon.svg에서 가장 큰 텍스트만 추출.
// Fraunces 800 + 라임 그라디언트. 글리프가 잘리지 않게 viewBox 폭 넉넉히.
export default function LimeWordmark({ height = 28 }: { height?: number }) {
  // 원본 좌표: text(x=20, y=120, size=128, letter-spacing=-5).
  // "Lime" 글리프 전체 폭 + 약간의 padding 고려해 viewBox 넓게.
  const VB_W = 380;
  const VB_H = 130;
  const ratio = VB_W / VB_H;
  return (
    <svg
      role="img"
      aria-label="Lime"
      width={height * ratio}
      height={height}
      viewBox={`10 10 ${VB_W} ${VB_H}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="lime-wm-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C8E83A" />
          <stop offset="100%" stopColor="#A0D020" />
        </linearGradient>
      </defs>
      <text
        x={20}
        y={120}
        fontFamily="var(--font-fraunces), Fraunces, serif"
        fontSize={128}
        fontWeight={800}
        fill="url(#lime-wm-grad)"
        letterSpacing={-5}
      >
        Lime
      </text>
    </svg>
  );
}
