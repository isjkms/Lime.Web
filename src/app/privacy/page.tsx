import type { Metadata } from "next";
import { PRIVACY_POLICY_BODY, PRIVACY_POLICY_VERSION } from "@/lib/legal";
import Markdown from "@/components/Markdown";

export const metadata: Metadata = { title: "개인정보 처리방침 · Lime" };

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto card">
      <div className="text-xs text-muted mb-3">버전 {PRIVACY_POLICY_VERSION}</div>
      <Markdown>{PRIVACY_POLICY_BODY}</Markdown>
    </article>
  );
}
