import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import PlayerBar from "@/components/PlayerBar";

// 앱 전체 동적 렌더링 — auth 쿠키 기반이라 prerender 의미가 없고, 빌드 타임 env 의존 에러도 방지.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Murate — 음악 평론",
  description: "10점 만점, 한 줄의 임팩트",
  openGraph: {
    title: "Murate",
    description: "10점 만점, 한 줄의 임팩트",
    type: "website",
    siteName: "Murate",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="pb-32" suppressHydrationWarning>
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <PlayerBar />
      </body>
    </html>
  );
}
