// 구조화 로그 — JSON 한 줄. Sentry/Datadog 연동 시 이 함수만 교체.
type Level = "debug" | "info" | "warn" | "error";

const enabled = (lvl: Level) => {
  if (process.env.NODE_ENV === "production") return lvl !== "debug";
  return true;
};

function emit(level: Level, scope: string, msg: string, meta?: Record<string, unknown>) {
  if (!enabled(level)) return;
  const rec = {
    t: new Date().toISOString(),
    level,
    scope,
    msg,
    ...(meta ?? {}),
  };
  const line = JSON.stringify(rec);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (scope: string, msg: string, meta?: Record<string, unknown>) => emit("debug", scope, msg, meta),
  info: (scope: string, msg: string, meta?: Record<string, unknown>) => emit("info", scope, msg, meta),
  warn: (scope: string, msg: string, meta?: Record<string, unknown>) => emit("warn", scope, msg, meta),
  error: (scope: string, msg: string, meta?: Record<string, unknown>) => emit("error", scope, msg, meta),
};
