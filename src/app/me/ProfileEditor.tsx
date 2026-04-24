"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser, signOut, spotifyConnectUrl, disconnectSpotify } from "@/lib/auth-client";

export default function ProfileEditor({
  initialName,
  initialAvatar,
  points,
  nicknameChanges,
  spotifyConnected,
  provider,
  joinedAt,
}: {
  initialName: string;
  initialAvatar: string;
  points: number;
  nicknameChanges: number;
  spotifyConnected: boolean;
  provider: string;
  joinedAt: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMsg("파일이 2MB를 넘어요."); return; }
    setUploading(true); setMsg(null);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("로그인이 필요해요.");
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatar(pub.publicUrl);
      setMsg("업로드 완료. 저장을 눌러 반영해주세요.");
    } catch (err: any) {
      setMsg("업로드 실패: " + (err?.message ?? String(err)));
    } finally {
      setUploading(false);
    }
  };

  const nameChanged = name.trim() !== initialName.trim();
  const nicknameCost = nicknameChanges === 0 ? 0 : 500;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      // 닉네임 변경은 RPC로 (포인트 차감 + 카운트 증가)
      if (nameChanged) {
        const confirmMsg = nicknameCost === 0
          ? "닉네임을 변경할까요? (첫 변경은 무료)"
          : `닉네임 변경은 500P가 차감돼요. 진행할까요?`;
        if (!confirm(confirmMsg)) { setBusy(false); return; }
        const { error } = await supabase.rpc("change_nickname", { p_name: name.trim() });
        if (error) {
          if (error.message.includes("not_enough_points")) throw new Error("포인트가 부족해요 (500P 필요).");
          if (error.message.includes("invalid_name")) throw new Error("닉네임이 올바르지 않아요.");
          throw new Error(error.message);
        }
      }

      // 아바타 URL은 별도 업데이트
      if (avatar.trim() !== initialAvatar.trim()) {
        const user = await getCurrentUser();
        if (!user) throw new Error("로그인이 필요해요.");
        const { error } = await supabase.from("profiles")
          .update({ avatar_url: avatar.trim() || null })
          .eq("id", user.id);
        if (error) throw new Error(error.message);
      }

      setMsg("저장됐어요.");
      router.refresh();
    } catch (err: any) {
      setMsg(err.message ?? "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm("정말 탈퇴할까요? 모든 평가·반응·프로필이 삭제되고 복구할 수 없어요.")) return;
    if (!confirm("마지막 확인입니다. 계속할까요?")) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("delete_account");
    if (error) { setMsg("탈퇴 실패: " + error.message); setBusy(false); return; }
    await signOut();
    router.replace("/");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="card space-y-4">
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt="" className="w-16 h-16 rounded-full border border-border object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-panel2" />
          )}
          <div className="flex-1">
            <div className="text-sm text-muted">보유 포인트</div>
            <div className="text-2xl font-bold text-accent">{points}P</div>
          </div>
        </div>

        <label className="block">
          <span className="text-sm text-muted">닉네임</span>
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={24}
          />
          <p className="text-xs text-muted mt-1">
            {nicknameChanges === 0
              ? "첫 변경은 무료예요."
              : `다음 변경부터 500P가 차감돼요. (지금까지 ${nicknameChanges}회 변경)`}
          </p>
        </label>

        <div className="space-y-1.5">
          <span className="text-sm text-muted">아바타</span>
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="이미지 URL 또는 파일 업로드"
            />
            <label className="text-sm px-3 py-2 rounded-md border border-border hover:bg-panel2 cursor-pointer whitespace-nowrap">
              {uploading ? "업로드…" : "파일"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={onFileUpload}
                disabled={uploading || busy}
              />
            </label>
          </div>
          <p className="text-xs text-muted">PNG/JPG/WEBP/GIF · 최대 2MB</p>
        </div>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "저장 중…" : nameChanged && nicknameCost > 0 ? "저장 (−500P)" : "저장"}
        </button>
        {msg && <p className="text-sm text-center text-muted">{msg}</p>}
      </form>

      {/* Spotify 연결 */}
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

      {/* 계정 정보 */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">로그인</span>
          <span className="font-medium">{provider}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">가입일</span>
          <span className="font-medium">
            {joinedAt ? new Date(joinedAt).toLocaleDateString("ko-KR") : "-"}
          </span>
        </div>
      </div>

      {/* 계정 탈퇴 */}
      <div className="card border-red-900/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-red-400">계정 탈퇴</div>
            <div className="text-xs text-muted">모든 데이터가 영구 삭제됩니다.</div>
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
