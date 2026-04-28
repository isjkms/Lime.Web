import Link from "next/link";
import LimeLogo from "./LimeLogo";
import { getLatestAnnouncement } from "@/lib/announcements";

export default function Footer() {
  const latest = getLatestAnnouncement();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-2">
          <LimeLogo size={22} textClassName="text-base" />
          <p className="text-xs text-muted leading-relaxed max-w-md">
            Lime — 한 줄로 남기는 음악 평가.<br />
            Spotify에서 곡·앨범을 불러와 10점 만점으로 평가하고 다른 리스너의 한 줄을 만나보세요.
          </p>
        </div>

        <div className="text-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted">서비스</div>
          <div className="flex flex-col gap-1">
            <Link href="/announcements" className="hover:text-fg text-muted">공지·업데이트</Link>
            <Link href="/leaderboard" className="hover:text-fg text-muted">리더보드</Link>
            <Link href="/search" className="hover:text-fg text-muted">검색</Link>
          </div>
        </div>

        <div className="text-sm space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted">계정·정책</div>
          <div className="flex flex-col gap-1">
            <Link href="/me" className="hover:text-fg text-muted">내 프로필</Link>
            <Link href="/me/settings" className="hover:text-fg text-muted">설정</Link>
            <Link href="/terms" className="hover:text-fg text-muted">이용약관</Link>
            <Link href="/privacy" className="hover:text-fg text-muted">개인정보 처리방침</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>© {year} Lime. All rights reserved.</span>
          {latest && (
            <Link href="/announcements" className="hover:text-fg flex items-center gap-1.5">
              <span className="chip text-[10px]">최신</span>
              <span className="truncate max-w-[60vw]">{latest.title}</span>
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
