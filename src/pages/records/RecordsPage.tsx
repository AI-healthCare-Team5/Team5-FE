import { useState } from "react";
import { Navigate } from "react-router";
import { InlineConfirm } from "@/components/InlineConfirm";
import { ActionLink, Button, Card, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";
import { formatRecordDate } from "@/pages/records/formatRecordDate";

export function RecordsPage() {
  const { loggedIn, nickname, records } = useAppStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="self-start rounded-full bg-success-soft px-[14px] py-[6px] text-[0.889rem] text-success">
          {nickname
            ? `${nickname}님 · 카카오 계정으로 로그인 중`
            : "카카오 계정으로 로그인 중"}
        </p>
        <PageTitle description="로그인한 동안 만든 요약지를 보관해요. 최근 순이에요.">
          내 기록
        </PageTitle>
      </div>
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
        <ul className="space-y-[14px]">
          {records.map((record) => (
            <li key={record.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.889rem] text-muted">
                    {formatRecordDate(record.createdAt)}
                  </p>
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-[0.889rem] font-bold text-brand-strong">
                    {record.summary.department}
                  </span>
                </div>
                <h2 className="mt-3 text-[1.222rem] font-bold">
                  {record.summary.symptom}
                </h2>
                <p className="mt-1 text-[0.889rem] text-muted">
                  {record.summary.duration}
                  {` · 붓기 ${record.summary.swelling}`}
                </p>
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-6">
                  <ActionLink to={`/records/${record.id}`} variant="outline">
                    보기
                  </ActionLink>
                  <Button
                    variant="neutral"
                    className="min-w-[93px]"
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
