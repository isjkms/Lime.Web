// 공지·업데이트 노트. 코드 변경으로 추가 → 배포로 반영.
// 향후 DB·관리자 콘솔 도입 시 이 모듈만 교체하면 됨.

export type AnnouncementCategory = "release" | "notice" | "fix";

export type Announcement = {
  id: string;
  date: string; // YYYY-MM-DD
  category: AnnouncementCategory;
  title: string;
  body: string;
};

export const CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  release: "🚀 업데이트",
  notice: "📣 공지",
  fix: "🛠 수정",
};

// 최신순으로 작성. 새 항목은 배열 맨 위에 추가.
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "2026-04-27-launch",
    date: "2026-04-27",
    category: "release",
    title: "Lime 베타 시작",
    body:
      "Murate에서 Lime으로 새출발. 다크/라이트 테마 추가, 라임 단면 기본 아바타, " +
      "팔로우·실시간 알림, 포인트 시스템(가입 +10P, 작성 +5P 등)이 들어갔어요. " +
      "피드백은 설정 페이지 아래 메일로 부탁해요.",
  },
];

export function getAnnouncements(): Announcement[] {
  return [...ANNOUNCEMENTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestAnnouncement(): Announcement | null {
  return getAnnouncements()[0] ?? null;
}
