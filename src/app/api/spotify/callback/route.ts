import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/origin";

export async function GET(req: Request) {
  const origin = getOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("sp_oauth_state")?.value;
  const redirectUri = jar.get("sp_redirect_uri")?.value ?? `${origin}/api/spotify/callback`;
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(new URL("/?spotify=error", origin));
  }
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.redirect(new URL("/?spotify=error", origin));
  }
  const data = await res.json();
  const exp = Date.now() + data.expires_in * 1000;
  jar.set("sp_access", data.access_token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: data.expires_in });
  if (data.refresh_token) {
    jar.set("sp_refresh", data.refresh_token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  jar.set("sp_exp", String(exp), { httpOnly: false, sameSite: "lax", path: "/", maxAge: data.expires_in });
  jar.delete("sp_oauth_state");
  jar.delete("sp_redirect_uri");
  return NextResponse.redirect(new URL("/?spotify=ok", origin));
}
