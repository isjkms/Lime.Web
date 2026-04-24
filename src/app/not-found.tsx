import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md w-full text-center space-y-4">
        <div className="text-6xl font-bold text-accent">404</div>
        <div>
          <h1 className="text-xl font-bold">페이지를 찾을 수 없어요</h1>
          <p className="text-sm text-muted mt-1">주소를 다시 확인하거나, 검색으로 찾아보세요.</p>
        </div>
        <div className="flex gap-2 justify-center">
          <Link href="/" className="btn-primary text-sm">홈으로</Link>
          <Link href="/search" className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-panel2">
            검색
          </Link>
        </div>
      </div>
    </div>
  );
}
