import { createPublicClient } from "@/lib/supabase/public";

// 공개 집계용 — 쿠키 기반 auth client를 쓰면 RSC가 dynamic으로 굳어 ISR이 무력화됨.
const createClient = async () => createPublicClient();

function logSbError(tag: string, err: any) {
  // Supabase error는 enumerable이 아닌 필드를 가져 JSON.stringify가 {}로 찍힘.
  console.error(tag, {
    message: err?.message,
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
  });
}

export async function getRecentlyReviewed(
  target: "track" | "album",
  limit = 8
) {
  const supabase = await createClient();
  const fn = target === "track" ? "get_recently_reviewed_tracks" : "get_recently_reviewed_albums";
  const { data, error } = await (supabase.rpc as any)(fn, { p_limit: limit });
  if (!error) return data ?? [];
  logSbError(`[getRecentlyReviewed:${target}]`, error);
  // RPC가 아직 배포 전이면 구버전 집계로 폴백.
  return getRecentlyReviewedFallback(target, limit);
}

export async function getTopRated(
  target: "track" | "album",
  period: "day" | "month" | "year",
  limit = 6
) {
  const supabase = await createClient();
  const fn = target === "track" ? "get_top_rated_tracks" : "get_top_rated_albums";
  const { data, error } = await (supabase.rpc as any)(fn, { p_period: period, p_limit: limit });
  if (!error) return (data ?? []).map((r: any) => ({ ...r, avg: Number(r.avg) }));
  logSbError(`[getTopRated:${target}:${period}]`, error);
  return getTopRatedFallback(target, period, limit);
}

// ----- 폴백 (RPC 미배포 시) -----
async function getRecentlyReviewedFallback(target: "track" | "album", limit: number) {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("target_id, created_at")
    .eq("target_type", target)
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  if (!reviews?.length) return [];
  const latestBy = new Map<string, string>();
  for (const r of reviews as any[]) {
    if (!latestBy.has(r.target_id)) latestBy.set(r.target_id, r.created_at);
    if (latestBy.size >= limit) break;
  }
  const ids = [...latestBy.keys()];
  const table = target === "track" ? "tracks" : "albums";
  const { data: items } = await supabase.from(table).select("*").in("id", ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  return (items ?? [])
    .sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((it: any) => ({ ...it, last_review_at: latestBy.get(it.id) }));
}

async function getTopRatedFallback(
  target: "track" | "album",
  period: "day" | "month" | "year",
  limit: number
) {
  const supabase = await createClient();
  const since = new Date();
  if (period === "day") since.setDate(since.getDate() - 1);
  if (period === "month") since.setMonth(since.getMonth() - 1);
  if (period === "year") since.setFullYear(since.getFullYear() - 1);
  const { data } = await supabase
    .from("reviews")
    .select("target_id, rating")
    .eq("target_type", target)
    .gte("created_at", since.toISOString());
  if (!data?.length) return [];
  const agg = new Map<string, { sum: number; n: number }>();
  (data as any[]).forEach((r) => {
    const cur = agg.get(r.target_id) ?? { sum: 0, n: 0 };
    cur.sum += Number(r.rating);
    cur.n += 1;
    agg.set(r.target_id, cur);
  });
  const ranked = [...agg.entries()]
    .map(([id, v]) => ({ id, avg: v.sum / v.n, n: v.n }))
    .sort((a, b) => b.avg - a.avg || b.n - a.n)
    .slice(0, limit);
  if (!ranked.length) return [];
  const table = target === "track" ? "tracks" : "albums";
  const { data: items } = await supabase
    .from(table)
    .select("*")
    .in("id", ranked.map((r) => r.id));
  const order = new Map(ranked.map((r, i) => [r.id, i]));
  const scoreById = new Map(ranked.map((r) => [r.id, r]));
  return (items ?? [])
    .sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((it: any) => ({
      ...it,
      avg: scoreById.get(it.id)?.avg ?? 0,
      n: scoreById.get(it.id)?.n ?? 0,
    }));
}

export async function getFamousRecentReviews(limit = 8) {
  const supabase = await createClient();
  const { data: famous } = await supabase
    .from("profiles")
    .select("id")
    .gte("review_count", 1000)
    .gte("likes_received", 1000)
    .limit(100);
  const ids = (famous ?? []).map((p: any) => p.id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("reviews")
    .select("id, user_id, target_type, target_id, rating, comment, created_at, profiles(display_name, avatar_url)")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!data?.length) return [];
  const trackIds = (data as any[]).filter((r) => r.target_type === "track").map((r) => r.target_id);
  const albumIds = (data as any[]).filter((r) => r.target_type === "album").map((r) => r.target_id);
  const [tRes, aRes] = await Promise.all([
    trackIds.length ? supabase.from("tracks").select("id, title, artist, cover_url").in("id", trackIds) : { data: [] as any[] },
    albumIds.length ? supabase.from("albums").select("id, title, artist, cover_url").in("id", albumIds) : { data: [] as any[] },
  ]);
  const tMap = new Map((tRes.data ?? []).map((t: any) => [t.id, t]));
  const aMap = new Map((aRes.data ?? []).map((a: any) => [a.id, a]));
  return (data as any[]).map((r) => ({
    ...r,
    item: r.target_type === "track" ? tMap.get(r.target_id) : aMap.get(r.target_id),
  })).filter((r) => r.item);
}
