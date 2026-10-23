import { useState } from "react";
import { Navigate } from "react-router";
import { InlineConfirm } from "@/components/InlineConfirm";
import { ActionLink, Button, Card, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";

export function RecordsPage() {
  const { loggedIn, nickname, records } = useAppStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <PageTitle description="저장한 진료 요약지를 다시 볼 수 있어요.">
        내 기록
      </PageTitle>
      <p className="rounded-full bg-brand-soft px-4 py-2 text-[0.889rem] text-brand-strong">
        {nickname
          ? `${nickname} 님 · 카카오 로그인 중`
          : "카카오 계정으로 로그인 중"}
      </p>
      <p className="font-bold">저장한 기록 {records.length}건</p>
      {records.length === 0 ? (
        <Card>
          <h2 className="font-bold">아직 저장한 기록이 없어요</h2>
          <p className="mt-2 text-muted">
            진료 요약지를 만들고 내 기록에 보관해 보세요.
          </p>
          <div className="mt-4">
            <ActionLink to="/">진료 준비 시작하기</ActionLink>
          </div>
        </Card>
      ) : (
        <ul className="space-y-4">
          {records.map((record) => (
            <li key={record.id}>
              <Card>
                <p className="text-[0.833rem] text-muted">
                  {new Date(record.createdAt).toLocaleDateString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <h2 className="mt-2 text-[1.222rem] font-bold">
                  {record.summary.symptom}
                </h2>
                <p className="mt-1 text-[0.889rem] text-muted">
                  {record.summary.department} · {record.summary.duration}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <ActionLink to={`/records/${record.id}`}>보기</ActionLink>
                  <Button
                    variant="outline"
                    onClick={() => setDeletingId(record.id)}
                  >
                    지우기
                  </Button>
                </div>
                {deletingId === record.id && (
                  <div className="mt-4">
                    <InlineConfirm
                      message="이 기록을 지울까요? 지운 기록은 되돌릴 수 없어요."
                      onCancel={() => setDeletingId(null)}
                      onConfirm={() => {
                        appActions.deleteRecord(record.id);
                        setDeletingId(null);
                      }}
                    />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ActionLink to="/my-info" variant="outline">
        내 정보 · 계정
      </ActionLink>
      <ActionLink to="/" variant="quiet">
        처음으로
      </ActionLink>
    </>
  );
}
