const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiUrl = (p: string) => `${API_BASE.replace(/\/$/, "")}${p}`;

export type ConsentItem = { docKind: "Terms" | "PrivacyCollection"; docVersion: string };

export async function recordConsents(items: ConsentItem[]): Promise<void> {
  const res = await fetch(apiUrl("/users/me/consents"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const d = await res.json(); msg = d.error ?? msg; } catch {}
    throw new Error(msg);
  }
}
