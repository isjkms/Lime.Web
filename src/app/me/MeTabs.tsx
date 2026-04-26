"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/me", label: "정보" },
  { href: "/me/reviews", label: "내 후기" },
  { href: "/me/points", label: "포인트" },
];

export default function MeTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-border" role="tablist">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            className={
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition " +
              (active
                ? "border-accent text-white"
                : "border-transparent text-muted hover:text-white")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
