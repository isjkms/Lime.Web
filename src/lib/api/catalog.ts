const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
function apiUrl(path: string) {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

export type ArtistRef = { spotifyId: string; name: string };

export type TrackDto = {
  id: string;
  spotifyId: string;
  name: string;
  durationMs: number | null;
  trackNumber: number | null;
  previewUrl: string | null;
  artists: ArtistRef[];
  albumId: string | null;
  albumName: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  stats: { avgRating: number; reviewCount: number };
};

export type AlbumTrack = {
  id: string;
  spotifyId: string;
  name: string;
  durationMs: number | null;
  trackNumber: number | null;
  previewUrl: string | null;
  artists: ArtistRef[];
};

export type AlbumDto = {
  id: string;
  spotifyId: string;
  name: string;
  coverUrl: string | null;
  releaseDate: string | null;
  artists: ArtistRef[];
  tracks: AlbumTrack[];
  stats: { avgRating: number; reviewCount: number };
};

async function j<T>(res: Response, allow404 = false): Promise<T | null> {
  if (res.status === 404 && allow404) return null;
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function ensureTrack(spotifyId: string, init?: RequestInit): Promise<TrackDto> {
  const res = await fetch(apiUrl("/catalog/tracks/ensure"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ spotifyId }),
    cache: "no-store",
    ...init,
  });
  return (await j<TrackDto>(res))!;
}

export async function ensureAlbum(spotifyId: string, init?: RequestInit): Promise<AlbumDto> {
  const res = await fetch(apiUrl("/catalog/albums/ensure"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ spotifyId }),
    cache: "no-store",
    ...init,
  });
  return (await j<AlbumDto>(res))!;
}

export async function getTrack(id: string, init?: RequestInit): Promise<TrackDto | null> {
  const res = await fetch(apiUrl(`/catalog/tracks/${id}`), { credentials: "include", cache: "no-store", ...init });
  return j<TrackDto>(res, true);
}

export async function getAlbum(id: string, init?: RequestInit): Promise<AlbumDto | null> {
  const res = await fetch(apiUrl(`/catalog/albums/${id}`), { credentials: "include", cache: "no-store", ...init });
  return j<AlbumDto>(res, true);
}
