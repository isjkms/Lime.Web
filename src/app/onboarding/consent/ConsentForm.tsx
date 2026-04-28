"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { recordConsents } from "@/lib/api/legal";
import Markdown from "@/components/Markdown";
import { signOut, deleteAccount } from "./actions";
import {
  TERMS_VERSION, TERMS_BODY,
  PRIVACY_COLLECTION_VERSION, PRIVACY_COLLECTION_BODY,
} from "@/lib/legal";

type DocKey = "terms" | "privacy" | null;

export default function ConsentForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<DocKey>(null);

  const allChecked = age && terms && privacy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecked) return;
    setBusy(true); setErr(null);
    try {
      await recordConsents([
        { docKind: "Terms", docVersion: TERMS_VERSION },
        { docKind: "PrivacyCollection", docVersion: PRIVACY_COLLECTION_VERSION },
      ]);
      router.replace(returnTo);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "저장 실패");
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!confirm("가입을 취소하면 계정이 삭제되고 로그아웃됩니다. 진행할까요?")) return;
    setBusy(true);
    try {
      await deleteAccount();
      await signOut();
      router.replace("/");
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto card space-y-5">
      <div>
        <h1 className="text-xl font-bold">가입 전 동의가 필요해요</h1>
        <p className="text-sm text-muted mt-1">
          서비스 이용을 위해 아래 항목에 동의해주세요. 동의하지 않으면 가입이 취소됩니다.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Check
          checked={age}
          onChange={setAge}
          label="만 14세 이상입니다."
          required
        />
        <Check
          checked={terms}
          onChange={setTerms}
          label={
            <span>
              <DocLink onClick={() => setOpenDoc("terms")}>이용약관</DocLink>에 동의합니다.
            </span>
          }
          required
        />
        <Check
          checked={privacy}
          onChange={setPrivacy}
          label={
            <span>
              <DocLink onClick={() => setOpenDoc("privacy")}>개인정보 수집·이용</DocLink>에 동의합니다.
            </span>
          }
          required
        />

        <div className="pt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm border border-border text-muted hover:text-fg hover:border-red-400/60"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!allChecked || busy}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "처리 중…" : "시작하기"}
          </button>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}
      </form>

      {openDoc && (
        <DocModal
          title={openDoc === "terms" ? "이용약관" : "개인정보 수집·이용"}
          version={openDoc === "terms" ? TERMS_VERSION : PRIVACY_COLLECTION_VERSION}
          body={openDoc === "terms" ? TERMS_BODY : PRIVACY_COLLECTION_BODY}
          onAgree={openDoc === "terms"
            ? () => { setTerms(true); setOpenDoc(null); }
            : () => { setPrivacy(true); setOpenDoc(null); }}
          onClose={() => setOpenDoc(null)}
        />
      )}
    </div>
  );
}

function DocLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="underline underline-offset-2 hover:text-fg"
    >
      {children}
    </button>
  );
}

function Check({
  checked, onChange, label, required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-accent"
      />
      <span className="flex-1">
        {required && <span className="text-red-400 mr-1">*</span>}
        {label}
      </span>
    </label>
  );
}

function DocModal({
  title, version, body, onAgree, onClose,
}: {
  title: string;
  version: string;
  body: string;
  onAgree: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  // Esc로 닫기 + body 스크롤 잠금 + portal mount
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  // Portal로 body 직접 마운트 — 부모 `.card`의 backdrop-filter가
  // containing block을 만들어 fixed가 갇히는 문제 회피.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div>
            <h2 id="doc-modal-title" className="text-base font-semibold">{title}</h2>
            <div className="text-xs text-muted">버전 {version}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-muted hover:text-fg text-xl leading-none px-2 -my-1"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          <Markdown>{body}</Markdown>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-sm border border-border text-muted hover:text-fg"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="btn-primary text-sm"
          >
            동의합니다
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
