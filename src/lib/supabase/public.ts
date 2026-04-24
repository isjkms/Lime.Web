// 쿠키를 사용하지 않는 익명 서버 클라이언트.
// 공개 RPC/집계 용도. cookies() 의존이 없어 RSC 캐시/ISR이 정상 작동.
import { createClient as createSbClient } from "@supabase/supabase-js";

let cached: ReturnType<typeof createSbClient> | null = null;

export function createPublicClient() {
  if (cached) return cached;
  cached = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return cached;
}
