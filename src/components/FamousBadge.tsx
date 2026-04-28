export default function FamousBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "md" ? "text-xs px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold text-fg ${cls}`}
      style={{
        background: "linear-gradient(135deg, #fbbf24 0%, #bef264 100%)",
        boxShadow: "0 2px 8px -2px rgba(255, 92, 138, 0.5)",
      }}
      title="후기 1000개 이상, 좋아요 1000개 이상을 받은 유명 평가자"
    >
      ★ 유명 평가자
    </span>
  );
}
