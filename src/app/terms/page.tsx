import type { Metadata } from "next";
import { TERMS_BODY, TERMS_VERSION } from "@/lib/legal";
import Markdown from "@/components/Markdown";

export const metadata: Metadata = { title: "이용약관 · Lime" };

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto card">
      <div className="text-xs text-muted mb-3">버전 {TERMS_VERSION}</div>
      <Markdown>{TERMS_BODY}</Markdown>
    </article>
  );
}
