import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlayerBar from "@/components/PlayerBar";
import ThemeBoot from "@/components/ThemeBoot";
import { getCurrentUser } from "@/lib/auth";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-fraunces",
  display: "swap",
});

// 앱 전체 동적 렌더링 — auth 쿠키 기반이라 prerender 의미가 없고, 빌드 타임 env 의존 에러도 방지.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Lime — 한 줄 음악 평가",
  description: "10점 만점, 한 줄의 임팩트",
  openGraph: {
    title: "Lime",
    description: "10점 만점, 한 줄의 임팩트",
    type: "website",
    siteName: "Lime",
  },
  twitter: { card: "summary_large_image" },
};

// 동의 게이트 화이트리스트 — 동의 미완료 사용자도 자유롭게 볼 수 있는 경로.
const CONSENT_ALLOWLIST = [
  "/onboarding/consent",
  "/terms",
  "/privacy",
  "/announcements",
  "/login",
];
function isAllowed(pathname: string) {
  return CONSENT_ALLOWLIST.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/";
  const user = await getCurrentUser();
  if (user?.consentRequired && !isAllowed(pathname)) {
    redirect(`/onboarding/consent?returnTo=${encodeURIComponent(pathname)}`);
  }

  return (
    <html lang="ko" className={fraunces.variable} suppressHydrationWarning>
      <head>
        <ThemeBoot />
      </head>
      <body className="pb-32 flex flex-col min-h-screen" suppressHydrationWarning>
        <Header />
        <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">{children}</main>
        <Footer />
        <PlayerBar />
      </body>
    </html>
  );
}
