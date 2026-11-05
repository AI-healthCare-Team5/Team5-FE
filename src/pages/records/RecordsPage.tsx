import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { InlineConfirm } from "@/components/InlineConfirm";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Card, PageTitle } from "@/components/ui";
import { formatRecordDate } from "@/pages/records/formatRecordDate";
import {
  createRecordsScreen,
  initialRecordsView,
  type RecordsScreen,
} from "@/pages/records/recordsScreen";
import { appActions, useAppStore } from "@/stores/appStore";

export function RecordsPage() {
  const { nickname } = useAppStore();
  const navigate = useNavigate();
  const [view, setView] = useState(initialRecordsView);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const screenRef = useRef<RecordsScreen | null>(null);

  // 로그인 확인과 목록 불러오기, 지우기는 recordsScreen.ts가 맡습니다.
  // 화면을 떠나면 진행 중인 요청을 취소합니다.
  useEffect(() => {
    const screen = createRecordsScreen({
      onView: setView,
      onExit: () => {
        // 로그인하면 이 화면으로 돌아옵니다.
        appActions.prepareLogin("/records");
        navigate("/login", { replace: true });
      },
    });
    screenRef.current = screen;
    void screen.load();
    return () => {
      screen.dispose();
      screenRef.current = null;
    };
  }, [navigate]);

  if (view.phase !== "ready") {
    return (
      <>
        <PageTitle>내 기록</PageTitle>
        {view.phase === "error" ? (
          <>
            <WarningNotice>{view.message ?? ""}</WarningNotice>
            <div className="flex flex-col gap-3">
              <Button onClick={() => void screenRef.current?.load()}>
                다시 시도
              </Button>
              <ActionLink to="/" variant="quiet">
                처음으로
              </ActionLink>
            </div>
          </>
        ) : (
          <Card>
            <p role="status">기록을 불러오는 중이에요.</p>
          </Card>
        )}
      </>
    );
  }

  const { records, hasNext } = view;
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
      {records.length === 0 && !hasNext ? (
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
            <li key={record.medicalRecordId}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.889rem] text-muted">
                    {formatRecordDate(record.createdAt)}
                  </p>
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-[0.889rem] font-bold text-brand-strong">
                    {record.departmentName}
                  </span>
                </div>
                <h2 className="mt-3 text-[1.222rem] font-bold">
                  {record.mainSymptom}
                </h2>
                {record.subtitle && (
                  <p className="mt-1 text-[0.889rem] text-muted">
                    {record.subtitle}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-6">
                  <ActionLink
                    to={`/records/${record.medicalRecordId}`}
                    variant="outline"
                  >
                    보기
                  </ActionLink>
                  <Button
                    variant="neutral"
                    className="min-w-[93px]"
                    onClick={() => setConfirmingId(record.medicalRecordId)}
                  >
                    지우기
                  </Button>
                </div>
                {confirmingId === record.medicalRecordId && (
                  <div className="mt-4 space-y-3">
                    {view.deleteMessage && (
                      <WarningNotice>{view.deleteMessage}</WarningNotice>
                    )}
                    <InlineConfirm
                      message="이 기록을 지울까요? 지운 기록은 되돌릴 수 없어요."
                      busy={view.deletingId === record.medicalRecordId}
                      onCancel={() => setConfirmingId(null)}
                      onConfirm={() => {
                        void screenRef.current
                          ?.remove(record.medicalRecordId)
                          .then((removed) => {
                            if (removed) setConfirmingId(null);
                          });
                      }}
                    />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      {hasNext && (
        <div className="flex flex-col gap-3">
          {view.moreMessage && (
            <WarningNotice>{view.moreMessage}</WarningNotice>
          )}
          <Button
            variant="outline"
            aria-busy={view.loadingMore}
            disabled={view.loadingMore}
            onClick={() => void screenRef.current?.loadMore()}
          >
            {view.moreMessage ? "다시 시도" : "더 보기"}
          </Button>
        </div>
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
