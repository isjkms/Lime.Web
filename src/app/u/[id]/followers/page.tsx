import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/lib/api/users";
import { getFollowers } from "@/lib/api/social";
import FollowList from "../FollowList";

export const revalidate = 0;

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const init = cookieHeader ? { headers: { cookie: cookieHeader } } : undefined;

  const profile = await getUser(id, init);
  if (!profile) notFound();
  const page = await getFollowers(id, { pageSize: 50 }, init);

  return (
    <FollowList
      title={`${profile.displayName}의 팔로워`}
      backHref={`/u/${id}`}
      total={page.total}
      items={page.items}
      currentUserId={null}
    />
  );
}
