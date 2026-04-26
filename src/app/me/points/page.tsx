import { cookies } from "next/headers";
import { getMyPoints, POINTS } from "@/lib/api/points";

export const revalidate = 0;

const REASON_LABEL: Record<string, string> = {
  WelcomeBonus: "가입 보너스",
  ReviewCreated: "후기 작성",
  ReviewEdited: "후기 수정",
  ReviewDeleted: "후기 삭제",
  LikeReceived: "좋아요 받음",
  LikeRevoked: "좋아요 취소",
  NicknameChange: "닉네임 변경",
};

export default async function PointsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const init = cookieHeader ? { headers: { cookie: cookieHeader } } : undefined;

  const { balance, transactions } = await getMyPoints(init, 100);

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="text-sm text-muted">현재 보유</div>
        <div className="text-4xl font-bold text-accent mt-1">{balance}P</div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">최근 내역</h2>
        {transactions.length === 0 ? (
          <div className="card text-muted text-sm">아직 포인트 내역이 없어요.</div>
        ) : (
          <ul className="card divide-y divide-border p-0 overflow-hidden">
            {transactions.map((t) => {
              const positive = t.delta > 0;
              return (
                <li key={t.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <div className="font-medium">{REASON_LABEL[t.reason] ?? t.reason}</div>
                    <div className="text-xs text-muted">
                      {new Date(t.createdAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  <div
                    className={`tabular-nums font-semibold ${
                      positive ? "text-accent" : "text-red-400"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {t.delta}P
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card text-xs text-muted space-y-1">
        <div className="font-medium text-muted/90">적립·소비 규칙</div>
        <div>• 가입 보너스: <span className="text-accent">+{POINTS.welcomeBonus}P</span></div>
        <div>• 후기 작성: <span className="text-accent">+{POINTS.reviewCreated}P</span></div>
        <div>• 좋아요 받음: <span className="text-accent">+{POINTS.likeReceived}P</span> (취소 시 -{POINTS.likeReceived}P)</div>
        <div>• 후기 수정 (작성 후 {POINTS.graceMinutes}분 이내 무료): <span className="text-red-400">-{POINTS.reviewEdit}P</span></div>
        <div>• 후기 삭제 (작성 후 {POINTS.graceMinutes}분 이내 무료): <span className="text-red-400">-{POINTS.reviewDelete}P</span></div>
        <div>• 닉네임 변경 (1회 무료): <span className="text-red-400">-{POINTS.nicknameChange}P</span></div>
      </div>
    </div>
  );
}
