"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 콘솔에만 — 외부 로깅은 별도
    console.error("[app:error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md w-full text-center space-y-4">
        <div className="text-6xl font-bold text-red-400">500</div>
        <div>
          <h1 className="text-xl font-bold">일시적인 오류가 발생했어요</h1>
          <p className="text-sm text-muted mt-1">
            잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침해주세요.
          </p>
          {error.digest && (
            <p className="text-[10px] text-muted mt-2 font-mono">ref: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="btn-primary text-sm">다시 시도</button>
          <Link href="/" className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-panel2">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
