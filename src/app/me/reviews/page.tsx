import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getUser } from "@/lib/api/users";
import { listUserReviews } from "@/lib/api/reviews";
import MyReviewsClient from "./MyReviewsClient";

export const revalidate = 0;

export default async function MyReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const init = cookieHeader ? { headers: { cookie: cookieHeader } } : undefined;

  const [profile, page] = await Promise.all([
    getUser(user.id, init),
    listUserReviews(user.id, { pageSize: 50 }, init),
  ]);

  const ratings = page.items.map((r) => Number(r.rating));
  const avg = ratings.length ? ratings.reduce((s, x) => s + x, 0) / ratings.length : 0;

  return (
    <MyReviewsClient
      initialItems={page.items}
      stats={{
        reviewCount: profile?.reviewCount ?? 0,
        likesReceived: profile?.likesReceived ?? 0,
        avgRating: avg,
      }}
    />
  );
}
