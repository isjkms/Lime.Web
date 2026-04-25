import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { listUserReviews } from "@/lib/api/reviews";
import MyReviewsClient from "./MyReviewsClient";

export const revalidate = 0;

export default async function MyReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const page = await listUserReviews(user.id, { pageSize: 50 }, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  return <MyReviewsClient initialItems={page.items} />;
}
