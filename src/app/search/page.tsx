import { Suspense } from "react";
import SearchClient from "./SearchClient";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="card text-muted">불러오는 중…</div>}>
      <SearchClient />
    </Suspense>
  );
}
