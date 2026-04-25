import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser, getSpotifyToken } from "@/lib/auth";
import { getUser } from "@/lib/api/users";
import { listUserReviews } from "@/lib/api/reviews";
import ProfileEditor from "./ProfileEditor";

export const revalidate = 0;

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const init = cookieHeader ? { headers: { cookie: cookieHeader } } : undefined;

  const [profile, reviewsPage, spotifyToken] = await Promise.all([
    getUser(user.id, init),
    listUserReviews(user.id, { pageSize: 50 }, init),
    getSpotifyToken(),
  ]);

  const ratings = reviewsPage.items.map((r) => Number(r.rating));
  const avg = ratings.length ? ratings.reduce((s, x) => s + x, 0) / ratings.length : 0;
  const spotifyConnected = !!spotifyToken;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">내 정보</h1>
        <p className="text-muted text-sm mt-1">{user.email ?? "—"}</p>
      </div>

      <div className="card">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="평가" value={`${profile?.reviewCount ?? 0}`} />
          <Stat label="받은 좋아요" value={`${profile?.likesReceived ?? 0}`} />
          <Stat label="평균 별점" value={avg ? avg.toFixed(1) : "-"} />
        </div>
      </div>

      <ProfileEditor
        userId={user.id}
        initialName={user.name ?? ""}
        initialAvatar={user.avatarUrl ?? ""}
        initialBio={user.bio ?? ""}
        spotifyConnected={spotifyConnected}
        joinedAt={user.createdAt ?? profile?.createdAt ?? null}
        providers={user.providers}
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
