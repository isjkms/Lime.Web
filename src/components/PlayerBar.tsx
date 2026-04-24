"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/store/player";

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

function fmt(ms: number) {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const {
    current, isPlaying, positionMs, durationMs, volume, mode, seekToken, seekMs,
    setPlaying, setPosition, setDuration, setVolume, setMode, seek,
  } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);
  const deviceIdRef = useRef<string | null>(null);
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [hasSpotifyToken, setHasSpotifyToken] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const lastVolRef = useRef(volume);

  useEffect(() => {
    const check = () =>
      fetch("/api/spotify/user-token").then((r) => r.json())
        .then((d) => setHasSpotifyToken(!!d.token)).catch(() => {});
    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    // 곡 선택 시에도 다시 확인 (로그인 직후 대비)
    const onPlay = () => { if (!hasSpotifyToken) check(); };
    window.addEventListener("spotify:recheck", onPlay);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("spotify:recheck", onPlay);
    };
  }, [hasSpotifyToken]);

  useEffect(() => {
    if (current && !hasSpotifyToken) {
      window.dispatchEvent(new Event("spotify:recheck"));
    }
  }, [current?.id]);

  useEffect(() => {
    if (!hasSpotifyToken) return;
    if (document.getElementById("spotify-sdk")) return;
    const script = document.createElement("script");
    script.id = "spotify-sdk";
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Murate Web Player",
        getOAuthToken: async (cb: (t: string) => void) => {
          const d = await fetch("/api/spotify/user-token").then((r) => r.json());
          if (d.token) cb(d.token);
        },
        volume: volume,
      });
      player.addListener("ready", ({ device_id }: any) => {
        deviceIdRef.current = device_id;
        setSpotifyReady(true);
      });
      player.addListener("player_state_changed", (state: any) => {
        if (!state) return;
        setPlaying(!state.paused);
        setPosition(state.position);
        setDuration(state.duration);
      });
      player.addListener("initialization_error", ({ message }: any) => setWarn(message));
      player.addListener("authentication_error", ({ message }: any) => setWarn(message));
      player.addListener("account_error", () => setWarn("Spotify Premium 계정이 필요합니다."));
      player.connect();
      playerRef.current = player;
    };
    return () => { playerRef.current?.disconnect?.(); };
  }, [hasSpotifyToken]);

  useEffect(() => {
    if (!current) return;
    // 새로고침 시 persist로 current만 복원됨 (isPlaying은 저장 안 함 → false).
    // 사용자가 명시적으로 play를 누른 경우에만 auto-play.
    if (!isPlaying) return;
    setWarn(null);
    (async () => {
      if (hasSpotifyToken && spotifyReady && current.spotifyId && deviceIdRef.current) {
        setMode("spotify");
        const { token } = await fetch("/api/spotify/user-token").then((r) => r.json());
        if (!token) return;
        const res = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ uris: [`spotify:track:${current.spotifyId}`] }) }
        );
        if (res.status === 403) setWarn("Spotify Premium 계정이 필요합니다.");
        else if (!res.ok) setWarn("재생 실패 — Spotify 앱이 활성 상태인지 확인해 주세요.");
        return;
      }
      if (current.previewUrl && audioRef.current) {
        setMode("preview");
        audioRef.current.src = current.previewUrl;
        audioRef.current.play().catch(() => setWarn("브라우저 정책으로 자동재생이 차단됐어요."));
        return;
      }
      setMode("idle");
      if (current.spotifyId && !hasSpotifyToken) {
        setWarn("Spotify 연결 시 풀재생 가능.");
      } else {
        setWarn("재생할 수 있는 소스가 없어요.");
      }
    })();
  }, [current?.id, hasSpotifyToken, spotifyReady, isPlaying]);

  useEffect(() => {
    if (mode === "preview" && audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
    if (mode === "spotify" && playerRef.current) {
      if (isPlaying) playerRef.current.resume();
      else playerRef.current.pause();
    }
  }, [isPlaying, mode]);

  // Spotify 모드일 때 position polling (SDK는 자동 업데이트 안 함)
  useEffect(() => {
    if (mode !== "spotify" || !isPlaying) return;
    const t = setInterval(async () => {
      const state = await playerRef.current?.getCurrentState?.();
      if (state) {
        setPosition(state.position);
        if (state.duration) setDuration(state.duration);
      }
    }, 500);
    return () => clearInterval(t);
  }, [mode, isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (playerRef.current?.setVolume) playerRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!seekToken) return;
    if (mode === "preview" && audioRef.current) audioRef.current.currentTime = seekMs / 1000;
    if (mode === "spotify" && playerRef.current?.seek) playerRef.current.seek(seekMs);
  }, [seekToken]);

  if (!current) return null;

  const pct = durationMs ? Math.min(100, (positionMs / durationMs) * 100) : 0;
  const volPct = Math.round((muted ? 0 : volume) * 100);

  const toggleMute = () => {
    if (muted) { setVolume(lastVolRef.current || 0.7); setMuted(false); }
    else { lastVolRef.current = volume; setVolume(0); setMuted(true); }
  };

  return (
    <div className="fixed bottom-3 inset-x-3 md:inset-x-6 z-40">
      <div className="max-w-6xl mx-auto rounded-2xl border border-border overflow-hidden shadow-2xl"
           style={{
             background: "linear-gradient(135deg, rgba(22,17,32,0.92) 0%, rgba(31,24,48,0.92) 100%)",
             backdropFilter: "blur(18px)",
           }}>
        {/* 상단 진행바 */}
        <div
          className="h-1 w-full bg-white/5 relative cursor-pointer"
          onClick={(e) => {
            if (!durationMs) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            seek(ratio * durationMs);
          }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${pct}%`, background: "linear-gradient(to right, #ff5c8a, #a78bfa)" }}
          />
        </div>

        <div className="px-3 md:px-5 py-3 flex items-center gap-3 md:gap-5">
          {/* 커버 — LP 스타일 */}
          <div className="relative shrink-0 w-14 h-14 md:w-16 md:h-16">
            {current.coverUrl ? (
              <Link
                href={current.albumId ? `/albums/${current.albumId}` : `/tracks/${current.id}`}
                className="block w-full h-full"
              >
                <div
                  className={`relative w-full h-full rounded-full overflow-hidden ${isPlaying ? "animate-[spin_6s_linear_infinite]" : ""}`}
                  style={{ boxShadow: "0 8px 24px -8px rgba(255,92,138,0.45)" }}
                >
                  {/* 앨범 이미지를 디스크 전체로 꽉 채움 */}
                  <img
                    src={current.coverUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* 그루브 오버레이 */}
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background:
                        "repeating-radial-gradient(circle at center, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)",
                      mixBlendMode: "overlay",
                    }}
                  />
                  {/* 중앙 스핀들 구멍 */}
                  <div
                    aria-hidden
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[12%] h-[12%] rounded-full"
                    style={{ background: "#161120", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2), 0 0 0 2px rgba(0,0,0,0.4)" }}
                  />
                </div>
              </Link>
            ) : (
              <div className="w-full h-full rounded-full bg-panel2 flex items-center justify-center text-xl">♪</div>
            )}
          </div>

          {/* 제목 + 타이머 */}
          <div className="min-w-0 flex-1">
            <Link href={`/tracks/${current.id}`} className="block truncate font-semibold text-sm md:text-base hover:text-accent transition">
              {current.title}
            </Link>
            <div className="truncate text-xs text-muted">{current.artist}</div>
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted mt-1 tabular-nums">
              <span>{fmt(positionMs)}</span>
              <span className="opacity-40">/</span>
              <span>{fmt(durationMs)}</span>
              {mode !== "idle" && (
                <span className="chip ml-1 text-[9px] md:text-[10px]" style={{ borderColor: "transparent", background: "rgba(255,92,138,0.15)", color: "#ff9cba" }}>
                  {mode === "spotify" ? "FULL" : "PREVIEW"}
                </span>
              )}
            </div>
          </div>

          {/* 컨트롤 */}
          <button
            onClick={() => setPlaying(!isPlaying)}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white text-lg shrink-0 active:scale-95 transition"
            style={{
              background: "linear-gradient(135deg, #ff5c8a, #a78bfa)",
              boxShadow: "0 8px 24px -6px rgba(255,92,138,0.6)",
            }}
            aria-label={isPlaying ? "일시정지" : "재생"}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          {/* 볼륨 */}
          <div className="hidden md:flex items-center gap-2 w-36 shrink-0 pr-2">
            <button onClick={toggleMute} className="text-muted hover:text-white transition" aria-label="음소거">
              {volPct === 0 ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.17v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              )}
            </button>
            <input
              type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
              onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
              className="slider flex-1"
              style={{ ["--pct" as any]: `${volPct}%` }}
            />
          </div>
        </div>

        {warn && (
          <div className="px-5 pb-2 text-[11px] text-amber text-center opacity-80">{warn}</div>
        )}

        <audio
          ref={audioRef}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime * 1000)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration * 1000)}
          onEnded={() => setPlaying(false)}
        />
      </div>
    </div>
  );
}
