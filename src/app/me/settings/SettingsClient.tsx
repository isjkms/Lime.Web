"use client";
import { useEffect, useState } from "react";
import { readStoredTheme, setTheme, type ThemeMode } from "@/lib/theme";

const THEMES: { value: ThemeMode; label: string; emoji: string; desc: string }[] = [
  { value: "light", label: "라이트", emoji: "☀️", desc: "밝은 배경 · 진한 글씨" },
  { value: "dark",  label: "다크",   emoji: "🌙", desc: "어두운 배경 · 눈 편안" },
  { value: "auto",  label: "시스템", emoji: "🖥️", desc: "OS 설정 따라감" },
];

export default function SettingsClient() {
  const [mode, setMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    setMode(readStoredTheme());
  }, []);

  const onPick = (v: ThemeMode) => {
    setMode(v);
    setTheme(v);
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">테마</h2>
          <p className="text-xs text-muted mt-0.5">화면 색상 모드를 선택하세요.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const active = mode === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onPick(t.value)}
                className={
                  "rounded-xl border p-3 text-left transition " +
                  (active
                    ? "border-accent ring-2 ring-accent/40 bg-panel2/60"
                    : "border-border hover:border-accent/60 bg-panel2/30")
                }
              >
                <div className="text-xl">{t.emoji}</div>
                <div className="text-sm font-medium mt-1">{t.label}</div>
                <div className="text-[11px] text-muted mt-0.5 line-clamp-2">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-1 text-xs text-muted">
        <div className="font-medium text-muted/90">앞으로 추가 예정</div>
        <div>• 알림 도착음 토글</div>
        <div>• 자동 재생 / 프리뷰 길이</div>
        <div>• 데이터 내보내기 / 계정 연결 관리</div>
      </section>
    </div>
  );
}
