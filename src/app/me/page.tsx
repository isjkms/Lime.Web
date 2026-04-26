import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser, getSpotifyToken } from "@/lib/auth";
import { getUser } from "@/lib/api/users";
import ProfileEditor from "./ProfileEditor";

export const revalidate = 0;

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const init = cookieHeader ? { headers: { cookie: cookieHeader } } : undefined;

  const [profile, spotifyToken] = await Promise.all([
    getUser(user.id, init),
    getSpotifyToken(),
  ]);
  const spotifyConnected = !!spotifyToken;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <ProfileEditor
        userId={user.id}
        email={user.email ?? ""}
        initialName={user.name ?? ""}
        initialAvatar={user.avatarUrl ?? ""}
        initialBio={user.bio ?? ""}
        spotifyConnected={spotifyConnected}
        joinedAt={user.createdAt ?? profile?.createdAt ?? null}
        providers={user.providers}
        followersCount={profile?.followersCount ?? 0}
        followingCount={profile?.followingCount ?? 0}
        nicknameChanges={user.nicknameChanges}
      />
    </div>
  );
}
