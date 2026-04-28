"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app:global-error]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#0b0d12", color: "#e7e9ef", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, width: "100%", textAlign: "center", border: "1px solid #2a2e3a", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#bef264" }}>500</div>
            <h1 style={{ fontSize: 20, margin: "12px 0 4px" }}>앱에 문제가 발생했어요</h1>
            <p style={{ fontSize: 14, color: "#8a8fa0", margin: 0 }}>
              새로고침하면 복구될 거예요.
            </p>
            {error.digest && (
              <p style={{ fontSize: 10, color: "#8a8fa0", marginTop: 8, fontFamily: "monospace" }}>
                ref: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg, #bef264, #facc15)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
