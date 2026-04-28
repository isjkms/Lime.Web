import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ConsentForm from "./ConsentForm";

export const revalidate = 0;

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // 이미 동의한 사용자는 진입 시 바로 홈으로
  if (!user.consentRequired) {
    const sp = await searchParams;
    redirect(sp.returnTo && sp.returnTo.startsWith("/") ? sp.returnTo : "/");
  }
  const sp = await searchParams;
  return <ConsentForm returnTo={sp.returnTo && sp.returnTo.startsWith("/") ? sp.returnTo : "/"} />;
}
