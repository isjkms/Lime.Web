"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { signOut, spotifyConnectUrl, disconnectSpotify } from "@/lib/auth-client";
import { updateMe, deleteMe, uploadAvatar } from "@/lib/api/users";
import { POINTS } from "@/lib/api/points";
import Avatar from "@/components/Avatar";

export default function ProfileEditor({
  userId,
  email,
  initialName,
  initialAvatar,
  initialBio,
  spotifyConnected,
  joinedAt,
  providers,
  followersCount,
  followingCount,
  nicknameChanges,
}: {
  userId: string;
  email: string;
  initialName: string;
  initialAvatar: string;
  initialBio: string;
  spotifyConnected: boolean;
  joinedAt: string | null;
  providers: string[];
  followersCount: number;
  followingCount: number;
  nicknameChanges: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const avatarBoxRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!avatarBoxRef.current?.contains(e.target as Node)) setAvatarMenu(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const persistAvatar = async (next: string | null) => {
    setBusy(true); setMsg(null);
    try {
      await updateMe({ avatarUrl: next });
      setAvatar(next ?? "");
      setMsg("아바타가 변경됐어요.");
      router.refresh();
    } catch (err: any) {
      const m = err?.message ?? "변경 실패";
      setMsg(m === "invalid_avatar_url" ? "아바타 URL이 올바르지 않아요." : m);
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMsg("파일은 2MB 이하만 가능해요."); return; }
    setBusy(true); setMsg(null);
    try {
      const { url } = await uploadAvatar(file);
      setAvatar(url);
      setMsg("아바타가 변경됐어요.");
      router.refresh();
    } catch (err: any) {
      const m = err?.message ?? "업로드 실패";
      const friendly =
        m === "file_too_large" ? "파일은 2MB 이하만 가능해요." :
        m === "invalid_content_type" ? "PNG/JPG/WEBP/GIF만 가능해요." :
        m;
      setMsg(friendly);
    } finally {
      setBusy(false);
    }
  };

  const onUrlOption = async () => {
    setAvatarMenu(false);
    const next = window.prompt("아바타 이미지 URL을 입력하세요.", avatar);
    if (next === null) return;
    await persistAvatar(next.trim() || null);
  };

  const onResetOption = async () => {
    setAvatarMenu(false);
    await persistAvatar(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: { displayName?: string; bio?: string | null } = {};
    const nameChanged = name.trim() !== initialName.trim();
    if (nameChanged) payload.displayName = name.trim();
    if (bio.trim() !== initialBio.trim()) payload.bio = bio.trim() || null;
    if (Object.keys(payload).length === 0) {
      setMsg("변경된 내용이 없어요.");
      return;
    }
    if (nameChanged && nicknameChanges >= 1) {
      if (!confirm(`닉네임 변경에 ${POINTS.nicknameChange}P가 차감돼요. 진행할까요?`)) return;
    }
    setBusy(true); setMsg(null);
    try {
      await updateMe(payload);
      setMsg("저장됐어요.");
      router.refresh();
    } catch (err: any) {
      const m = err?.message ?? "저장 실패";
      const friendly =
        m === "invalid_display_name" ? "닉네임은 1~32자여야 해요." :
        m === "invalid_avatar_url" ? "아바타 URL이 올바르지 않아요." :
        m === "invalid_bio" ? "소개는 200자 이하여야 해요." :
        m === "not_enough_points" ? `포인트가 부족해요 (${POINTS.nicknameChange}P 필요).` :
        m;
      setMsg(friendly);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm("정말 탈퇴할까요? 모든 평가·반응·프로필이 비공개 처리되고 복구할 수 없어요.")) return;
    if (!confirm("마지막 확인입니다. 계속할까요?")) return;
    setBusy(true); setMsg(null);
    try {
      await deleteMe();
      await signOut();
      router.replace("/");
    } catch (err: any) {
      setMsg("탈퇴 실패: " + (err?.message ?? "알 수 없는 오류"));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="card space-y-4">
        <div ref={avatarBoxRef} className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAvatarMenu((v) => !v)}
            disabled={busy}
            className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-accent"
            aria-haspopup="menu"
            aria-expanded={avatarMenu}
          >
            <Avatar src={avatar || null} seed={userId} size={64} />
            <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-fg text-xs font-medium">
              변경
            </span>
          </button>
          <div className="text-xs text-muted">
            아바타를 눌러 변경하세요.
          </div>

          {avatarMenu && (
            <div
              role="menu"
              className="absolute left-0 top-[72px] z-20 w-56 rounded-xl border border-border bg-panel shadow-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => { setAvatarMenu(false); fileInputRef.current?.click(); }}
                className="block w-full text-left px-4 py-2.5 hover:bg-panel2 text-sm"
              >
                📁 파일에서 업로드
              </button>
              <button
                type="button"
                onClick={onUrlOption}
                className="block w-full text-left px-4 py-2.5 hover:bg-panel2 text-sm border-t border-border"
              >
                🔗 URL로 변경
              </button>
              <button
                type="button"
                onClick={onResetOption}
                className="block w-full text-left px-4 py-2.5 hover:bg-panel2 text-sm border-t border-border text-muted"
              >
                🍋 기본 이미지로 변경
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onPickFile}
          />
        </div>

        <div className="flex gap-4 text-sm">
          <Link
            href={`/u/${userId}/followers`}
            className="hover:text-fg text-muted"
          >
            <b className="text-fg">{followersCount}</b> 팔로워
          </Link>
          <Link
            href={`/u/${userId}/following`}
            className="hover:text-fg text-muted"
          >
            <b className="text-fg">{followingCount}</b> 팔로잉
          </Link>
        </div>

        <label className="block">
          <span className="text-sm text-muted">이메일</span>
          <input
            className="input mt-1 opacity-70 cursor-not-allowed"
            value={email}
            disabled
            readOnly
          />
        </label>

        <label className="block">
          <span className="text-sm text-muted">닉네임</span>
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={32}
          />
          <p className="text-xs text-muted mt-1">
            {nicknameChanges === 0
              ? "첫 변경은 무료예요."
              : `다음 변경부터 ${POINTS.nicknameChange}P가 차감돼요. (지금까지 ${nicknameChanges}회 변경)`}
          </p>
        </label>

        <label className="block">
          <span className="text-sm text-muted">소개</span>
          <textarea
            className="input mt-1"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="자기소개 (200자 이내)"
          />
          <p className="text-xs text-muted mt-1 text-right">{bio.length} / 200</p>
        </label>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "저장 중…" : "저장"}
        </button>
        {msg && <p className="text-sm text-center text-muted">{msg}</p>}
      </form>

      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <SpotifyIcon />
            <div className="min-w-0">
              <div className="font-medium">Spotify 연결</div>
              <div className="text-xs text-muted truncate">
                {spotifyConnected ? "연결됨 · 곡 전체 재생 가능" : "연결하면 30초 프리뷰 대신 풀 재생"}
              </div>
            </div>
          </div>
          {spotifyConnected ? (
            <button
              onClick={async () => { await disconnectSpotify(); window.location.reload(); }}
              className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-panel2 whitespace-nowrap"
            >
              연결 해제
            </button>
          ) : (
            <a
              href={spotifyConnectUrl(returnTo)}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-[#1db954] text-black font-semibold hover:opacity-90 whitespace-nowrap"
            >
              <SpotifyIcon size={14} mono />
              연결
            </a>
          )}
        </div>
      </div>

      <div className="card space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">가입일</span>
          <span className="font-medium">
            {joinedAt ? new Date(joinedAt).toLocaleDateString("ko-KR") : "-"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">로그인 방식</span>
          <span className="font-medium">
            {providers.length === 0
              ? "-"
              : providers.map((p) => PROVIDER_LABEL[p.toLowerCase()] ?? p).join(", ")}
          </span>
        </div>
      </div>

      <div className="card border-red-900/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-red-400">계정 탈퇴</div>
            <div className="text-xs text-muted">계정이 비활성화되고 더 이상 로그인할 수 없어요.</div>
          </div>
          <button
            onClick={deleteAccount}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-full border border-red-900/60 text-red-400 hover:bg-red-950/40"
          >
            탈퇴
          </button>
        </div>
      </div>
    </div>
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  kakao: "Kakao",
  naver: "Naver",
};

function SpotifyIcon({ size = 24, mono = false }: { size?: number; mono?: boolean }) {
  const fill = mono ? "currentColor" : "#1db954";
  return (
    <svg width={size} height={size} viewBox="0 0 168 168" aria-hidden="true" className="shrink-0">
      <path
        fill={fill}
        d="M83.996.277C37.747.277.253 37.77.253 84.019c0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.745-83.738zm38.404 120.78a5.217 5.217 0 0 1-7.18 1.73c-19.662-12.01-44.414-14.73-73.564-8.07a5.222 5.222 0 0 1-6.249-3.93 5.213 5.213 0 0 1 3.926-6.25c31.9-7.29 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.835-56.823-17.843-83.448-9.764-3.453 1.043-7.1-.903-8.148-4.35a6.538 6.538 0 0 1 4.354-8.143c30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976zm.88-23.744c-26.99-16.031-71.52-17.505-97.289-9.684-4.138 1.255-8.514-1.081-9.768-5.219a7.835 7.835 0 0 1 5.221-9.771c29.581-8.98 78.756-7.245 109.83 11.202a7.823 7.823 0 0 1 2.74 10.733c-2.2 3.722-7.02 4.949-10.73 2.739z"
      />
    </svg>
  );
}
