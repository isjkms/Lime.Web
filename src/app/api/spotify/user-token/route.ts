import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const jar = await cookies();
  let access = jar.get("sp_access")?.value;
  const refresh = jar.get("sp_refresh")?.value;
  const exp = Number(jar.get("sp_exp")?.value ?? 0);

  if (!access && !refresh) {
    return NextResponse.json({ token: null }, { status: 200 });
  }

  if (access && exp > Date.now() + 30_000) {
    return NextResponse.json({ token: access });
  }

  if (refresh) {
    const id = process.env.SPOTIFY_CLIENT_ID!;
    const secret = process.env.SPOTIFY_CLIENT_SECRET!;
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ token: null }, { status: 200 });
    const data = await res.json();
    access = data.access_token as string;
    const newExp = Date.now() + data.expires_in * 1000;
    jar.set("sp_access", access, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: data.expires_in,
    });
    jar.set("sp_exp", String(newExp), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: data.expires_in,
    });
    return NextResponse.json({ token: access });
  }

  return NextResponse.json({ token: null });
}
