const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
function apiUrl(path: string) {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

type ArtistRef = { spotifyId: string; name: string };

type RecentRow = {
  id: string;
  spotifyId: string;
  title: string;
  artists: ArtistRef[];
  coverUrl: string | null;
  previewUrl?: string | null;
  albumId?: string | null;
  lastReviewAt: string;
  avg: number;
  n: number;
};

type TopRow = {
  id: string;
  spotifyId: string;
  title: string;
  artists: ArtistRef[];
  coverUrl: string | null;
  previewUrl?: string | null;
  albumId?: string | null;
  avg: number;
  n: number;
};

const joinArtists = (a: ArtistRef[] | null | undefined) =>
  (a ?? []).map((x) => x.name).join(", ");

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(apiUrl(path), { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getRecentlyReviewed(target: "track" | "album", limit = 8) {
  const rows = await fetchJson<RecentRow[]>(
    `/catalog/recent-reviewed?target=${target}&limit=${limit}`,
    [],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist: joinArtists(r.artists),
    cover_url: r.coverUrl,
    preview_url: r.previewUrl ?? null,
    spotify_id: r.spotifyId,
    album_id: r.albumId ?? null,
    avg: r.avg,
    n: r.n,
    last_review_at: r.lastReviewAt,
  }));
}

export type RecentMixedItem = {
  kind: "track" | "album";
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  lastReviewAt: string;
};

export async function getRecentlyReviewedMixed(limit = 10): Promise<RecentMixedItem[]> {
  type Row = {
    kind: "track" | "album";
    id: string;
    spotifyId: string;
    title: string;
    artists: ArtistRef[];
    coverUrl: string | null;
    lastReviewAt: string;
  };
  const rows = await fetchJson<Row[]>(`/catalog/recent-reviewed?target=mixed&limit=${limit}`, []);
  return rows.map((r) => ({
    kind: r.kind,
    id: r.id,
    spotifyId: r.spotifyId,
    title: r.title,
    artist: joinArtists(r.artists),
    coverUrl: r.coverUrl,
    lastReviewAt: r.lastReviewAt,
  }));
}

export async function getTopRated(
  target: "track" | "album",
  period: "day" | "month" | "year",
  limit = 6,
) {
  const rows = await fetchJson<TopRow[]>(
    `/catalog/top-rated?target=${target}&period=${period}&limit=${limit}`,
    [],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist: joinArtists(r.artists),
    cover_url: r.coverUrl,
    preview_url: r.previewUrl ?? null,
    spotify_id: r.spotifyId,
    album_id: r.albumId ?? null,
    avg: r.avg,
    n: r.n,
  }));
}

type FamousRow = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
  target: "track" | "album";
  track: { id: string; spotifyId: string; name: string; coverUrl: string | null; artists: ArtistRef[] } | null;
  album: { id: string; spotifyId: string; name: string; coverUrl: string | null; artists: ArtistRef[] } | null;
};

type FollowingFeedRow = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
  target: "track" | "album";
  track: { id: string; spotifyId: string; name: string; coverUrl: string | null; artists: ArtistRef[] } | null;
  album: { id: string; spotifyId: string; name: string; coverUrl: string | null; artists: ArtistRef[] } | null;
};

export async function getFollowingFeed(cookieHeader: string, limit = 10) {
  if (!API_BASE) return [];
  try {
    const res = await fetch(apiUrl(`/reviews/following-feed?limit=${limit}`), {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows: FollowingFeedRow[] = await res.json();
    return rows.map((r) => {
      const meta = r.target === "track" ? r.track : r.album;
      if (!meta) return null;
      return {
        id: r.id,
        user_id: r.user.id,
        target_type: r.target,
        target_id: meta.id,
        rating: r.rating,
        comment: r.body,
        created_at: r.createdAt,
        profiles: { display_name: r.user.name, avatar_url: r.user.avatarUrl },
        item: {
          id: meta.id,
          title: meta.name,
          artist: joinArtists(meta.artists),
          cover_url: meta.coverUrl,
        },
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  } catch {
    return [];
  }
}

export async function getFamousRecentReviews(limit = 8) {
  const rows = await fetchJson<FamousRow[]>(`/reviews/famous-feed?limit=${limit}`, []);
  return rows.map((r) => {
    const meta = r.target === "track" ? r.track : r.album;
    if (!meta) return null;
    return {
      id: r.id,
      user_id: r.user.id,
      target_type: r.target,
      target_id: meta.id,
      rating: r.rating,
      comment: r.body,
      created_at: r.createdAt,
      profiles: { display_name: r.user.name, avatar_url: r.user.avatarUrl },
      item: {
        id: meta.id,
        title: meta.name,
        artist: joinArtists(meta.artists),
        cover_url: meta.coverUrl,
      },
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
}
