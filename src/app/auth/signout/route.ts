import { NextResponse } from "next/server";
import { getOrigin } from "@/lib/origin";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function POST(request: Request) {
  if (API_BASE) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    await fetch(`${API_BASE.replace(/\/$/, "")}/auth/signout`, {
      method: "POST",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    }).catch(() => {});
  }
  return NextResponse.redirect(new URL("/", getOrigin(request)), { status: 303 });
}
