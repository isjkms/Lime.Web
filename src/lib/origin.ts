// 실제 클라이언트가 접속한 origin을 반환.
// NEXT_PUBLIC_SITE_URL이 설정되어 있으면 그것을 최우선으로 사용.
// 리버스 프록시 없이 포트 매핑(예: 80→3000)만 쓰는 경우 Host 헤더에 내부 포트가 노출되므로
// 환경변수로 명시하는 것이 가장 안전하다.
export function getOrigin(request: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const h = request.headers;
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("127.") || host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
