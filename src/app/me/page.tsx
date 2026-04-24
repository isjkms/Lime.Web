import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import ProfileEditor from "./ProfileEditor";

export const revalidate = 0;

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  kakao: "Kakao",
  email: "이메일",
};

export default async function MePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, points, nickname_changes, review_count, likes_received, created_at")
    .eq("id", user.id).single();

  // 평균 평점 (본인이 남긴 평가)
  const { data: myReviews } = await supabase
    .from("reviews").select("rating").eq("user_id", user.id);
  const avg = myReviews && myReviews.length
    ? (myReviews.reduce((s, r: any) => s + Number(r.rating), 0) / myReviews.length)
    : 0;

  const provider = "email";

  // Spotify 연결 여부 (cookie 기반 토큰)
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const spotifyConnected = !!cookieStore.get("sp_refresh")?.value;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">내 정보</h1>
        <p className="text-muted text-sm mt-1">{user.email}</p>
      </div>

      {/* 통계 카드 */}
      <div className="card">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="평가" value={`${profile?.review_count ?? 0}`} />
          <Stat label="받은 좋아요" value={`${profile?.likes_received ?? 0}`} />
          <Stat label="평균 별점" value={avg ? avg.toFixed(1) : "-"} />
        </div>
      </div>

      <ProfileEditor
        initialName={profile?.display_name ?? ""}
        initialAvatar={profile?.avatar_url ?? ""}
        points={profile?.points ?? 0}
        nicknameChanges={profile?.nickname_changes ?? 0}
        spotifyConnected={spotifyConnected}
        provider={PROVIDER_LABEL[provider] ?? provider}
        joinedAt={profile?.created_at ?? null}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
