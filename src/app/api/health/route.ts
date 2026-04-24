import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getAppToken } from "@/lib/spotify";

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
  const [db, spotify] = await Promise.all([
    timed(async () => {
      const sb = createPublicClient();
      const { error } = await sb.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
      if (error) throw new Error(error.message);
    }),
    timed(async () => {
      const t = await getAppToken();
      if (!t) throw new Error("no_token");
    }),
  ]);
  const ok = db.ok && spotify.ok;
  return NextResponse.json(
    { ok, db, spotify, at: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  );
}
