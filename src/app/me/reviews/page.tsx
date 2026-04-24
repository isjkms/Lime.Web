import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MyReviewsClient from "./MyReviewsClient";

export const revalidate = 0;

export default async function MyReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, target_type, target_id, rating, comment, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const trackIds = (reviews ?? []).filter((r) => r.target_type === "track").map((r) => r.target_id);
  const albumIds = (reviews ?? []).filter((r) => r.target_type === "album").map((r) => r.target_id);
  const [{ data: tracks }, { data: albums }] = await Promise.all([
    trackIds.length ? supabase.from("tracks").select("id, title, artist, cover_url").in("id", trackIds) : Promise.resolve({ data: [] as any[] }),
    albumIds.length ? supabase.from("albums").select("id, title, artist, cover_url").in("id", albumIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const lookup = new Map<string, any>();
  (tracks ?? []).forEach((t) => lookup.set(`track:${t.id}`, t));
  (albums ?? []).forEach((a) => lookup.set(`album:${a.id}`, a));

  const items = (reviews ?? []).map((r) => ({
    ...r,
    target: lookup.get(`${r.target_type}:${r.target_id}`) ?? null,
  }));

  return <MyReviewsClient items={items as any} initialPoints={profile?.points ?? 0} />;
}
