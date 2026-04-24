import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import ReportsTable from "./ReportsTable";

export const revalidate = 0;

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) {
    return (
      <div className="card text-muted">
        관리자 권한이 필요해요.
      </div>
    );
  }

  const { data: rows, error } = await supabase.rpc("get_reports_admin", { p_limit: 200 });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">신고 관리</h1>
        <span className="text-sm text-muted">{rows?.length ?? 0}건</span>
      </div>
      {error ? (
        <div className="card text-sm text-red-400">불러오기 실패: {error.message}</div>
      ) : (
        <ReportsTable initial={(rows ?? []) as any[]} />
      )}
    </div>
  );
}
