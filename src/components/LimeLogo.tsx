import LimeWordmark from "./LimeWordmark";

export default function LimeLogo({
  size = 24,
  showText = true,
}: {
  size?: number;
  /** @deprecated 호환용. LimeWordmark가 자체 스타일 처리. */
  textClassName?: string;
  showText?: boolean;
}) {
  if (!showText) return null;
  return <LimeWordmark height={size} />;
}
