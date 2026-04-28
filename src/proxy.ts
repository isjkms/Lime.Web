import { NextResponse, type NextRequest } from "next/server";

// 동의 게이트 화이트리스트 — 미동의 사용자도 자유롭게 볼 수 있는 경로.
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

const ACCESS_COOKIE = process.env.NEXT_PUBLIC_LIME_ACCESS_COOKIE ?? "lime_access";
const CONSENT_COOKIE = "lime_consent_ok";

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 페이지 server component가 `headers()`로 읽을 수 있도록 *요청* 헤더에 pathname 노출.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  // Hard gate — RootLayout `redirect()`는 클라이언트 네비게이션 시 안 도므로
  // 모든 요청(RSC 페치 포함)에 걸리는 middleware/proxy에서 직접 처리.
  const hasAccess = !!req.cookies.get(ACCESS_COOKIE);
  const consentOk = req.cookies.get(CONSENT_COOKIE)?.value === "1";
  const allowed = isAllowed(pathname);

  // 진단 — 문제 해결 후 제거
  console.log(`[proxy] ${pathname} access=${hasAccess} consentOk=${consentOk} allowed=${allowed} cookies=${req.cookies.getAll().map(c => c.name).join(",")}`);

  if (hasAccess && !consentOk && !allowed) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding/consent";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
