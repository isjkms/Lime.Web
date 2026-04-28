"use client";
import { loginUrl } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const params = useSearchParams();
  const returnTo = params.get("returnTo") ?? "/";

  const go = (provider: "google" | "kakao" | "naver") => {
    window.location.href = loginUrl(provider, returnTo);
  };

  return (
    <div className="max-w-sm mx-auto mt-16 md:mt-24 card space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="text-sm text-muted">평가를 남기려면 로그인이 필요해요.</p>
      </div>

      <button
        onClick={() => go("google")}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white text-[#1f1f1f] font-medium hover:bg-gray-100 active:scale-[0.99] transition border border-[#dadce0]"
      >
        <GoogleLogo />
        <span>Google로 계속하기</span>
      </button>

      <button
        onClick={() => go("kakao")}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium active:scale-[0.99] transition"
        style={{ background: "#FEE500", color: "rgba(0,0,0,0.85)" }}
      >
        <KakaoLogo />
        <span>카카오로 계속하기</span>
      </button>

      <button
        onClick={() => go("naver")}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium active:scale-[0.99] transition text-fg"
        style={{ background: "#03C75A" }}
      >
        <NaverLogo />
        <span>네이버로 계속하기</span>
      </button>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function KakaoLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#000" d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.87 5.3 4.66 6.71L5.5 21.5c-.09.3.24.54.5.37l4.5-3c.49.06.99.13 1.5.13 5.52 0 10-3.58 10-8S17.52 3 12 3z"/>
    </svg>
  );
}

function NaverLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
      <path fill="#fff" d="M11.54 10.69 7.98 5.5H4.5v9h3.96v-5.2l3.56 5.2h3.48v-9h-3.96v5.19z"/>
    </svg>
  );
}
