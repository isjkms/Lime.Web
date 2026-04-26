import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import SearchBar from "./SearchBar";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";

export default async function Header() {
  const user = await getCurrentUser();
  // isAdmin은 향후 #9(Reports) 이슈에서 연결.
  const points = user?.points ?? 0;
  const isAdmin = false;
  const name = user?.name ?? "";
  const avatar: string | null = user?.avatarUrl ?? null;
  return (
    <header className="border-b border-border bg-panel/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* 데스크톱: 3-zone 그리드. 좌 로고, 중앙 검색, 우 사용자 — 검색이 시각적으로 정중앙 */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto] items-center gap-6">
          <Link href="/" className="font-bold text-xl tracking-tight whitespace-nowrap">
            Murate<span className="text-accent">♪</span>
          </Link>
          <div className="flex justify-center">
            <div className="w-full max-w-xl">
              <Suspense fallback={null}>
                <SearchBar />
              </Suspense>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end">
            <Link href="/leaderboard" className="text-sm text-muted hover:text-white whitespace-nowrap">
              🏆 리더보드
            </Link>
            {user && <NotificationBell userId={user.id} />}
            {user ? (
              <UserMenu userId={user.id} name={name || "사용자"} avatarUrl={avatar} points={points} isAdmin={isAdmin} />
            ) : (
              <Link href="/login" className="btn-primary text-sm">로그인</Link>
            )}
          </div>
        </div>

        {/* 모바일: 1행 로고+유저, 2행 검색 */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="font-bold text-lg tracking-tight whitespace-nowrap">
              Murate<span className="text-accent">♪</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/leaderboard" aria-label="리더보드" className="text-base px-2 py-1 text-muted hover:text-white">
                🏆
              </Link>
              {user && <NotificationBell userId={user.id} />}
              {user ? (
                <UserMenu userId={user.id} name={name || "사용자"} avatarUrl={avatar} points={points} isAdmin={isAdmin} />
              ) : (
                <Link href="/login" className="btn-primary text-sm">로그인</Link>
              )}
            </div>
          </div>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
