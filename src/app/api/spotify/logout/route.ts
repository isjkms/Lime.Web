import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/origin";

export async function POST(req: Request) {
  const jar = await cookies();
  jar.delete("sp_access");
  jar.delete("sp_refresh");
  jar.delete("sp_exp");
  return NextResponse.redirect(new URL("/", getOrigin(req)), { status: 303 });
}
