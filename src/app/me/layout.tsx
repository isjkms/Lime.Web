import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import MeTabs from "./MeTabs";

export const revalidate = 0;

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">내 프로필</h1>
      <MeTabs />
      <div>{children}</div>
    </div>
  );
}
