export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
    release_date: string;
  };
  duration_ms: number;
  preview_url: string | null;
};

export type SpotifyAlbum = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; width: number; height: number }[];
  release_date: string;
  total_tracks: number;
};

// 사용자 OAuth (Web Playback SDK용) — Lime.Api 이관 예정
export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export function spotifyAuthUrl(state: string, redirectUri: string): string {
  const id = process.env.SPOTIFY_CLIENT_ID;
  if (!id) return "#";
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", id);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}
