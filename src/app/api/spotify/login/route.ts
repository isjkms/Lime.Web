import { NextResponse } from "next/server";
import { spotifyAuthUrl } from "@/lib/spotify";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/origin";

export async function GET(req: Request) {
  const origin = getOrigin(req);
  const state = crypto.randomUUID();
  const redirectUri = `${origin}/api/spotify/callback`;
  const auth = spotifyAuthUrl(state, redirectUri);
  const jar = await cookies();
  jar.set("sp_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  jar.set("sp_redirect_uri", redirectUri, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(auth);
}
