import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; ms: number; detail?: string };

async function timed(fn: () => Promise<unknown>): Promise<Check> {
  const t0 = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - t0 };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, detail: e?.message ?? "error" };
  }
}

export async function GET() {
  const apiBase = API_BASE.replace(/\/$/, "");
  const [api, spotify] = await Promise.all([
    timed(async () => {
      if (!apiBase) throw new Error("no_api_base");
      const res = await fetch(`${apiBase}/health/db`, { cache: "no-store" });
      if (!res.ok) throw new Error(`status_${res.status}`);
      const d = await res.json();
      if (!d.ok) throw new Error("db_unavailable");
    }),
    timed(async () => {
      if (!apiBase) throw new Error("no_api_base");
      const res = await fetch(`${apiBase}/spotify/search?q=ping`, { cache: "no-store" });
      if (!res.ok) throw new Error(`status_${res.status}`);
    }),
  ]);
  const ok = api.ok && spotify.ok;
  return NextResponse.json(
    { ok, api, spotify, at: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  );
}
