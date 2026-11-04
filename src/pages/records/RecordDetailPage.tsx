import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { InlineConfirm } from "@/components/InlineConfirm";
import { SummaryDocument } from "@/components/summary/SummaryDocument";
import { WarningNotice } from "@/components/WarningNotice";
import { ActionLink, Button, Card, PageTitle } from "@/components/ui";
import { formatRecordDate } from "@/pages/records/formatRecordDate";
import {
  createRecordDetailScreen,
  initialRecordDetailView,
  type RecordDetailScreen,
} from "@/pages/records/recordDetailScreen";
import { appActions } from "@/stores/appStore";

export function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState(initialRecordDetailView);
  const [large, setLarge] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const screenRef = useRef<RecordDetailScreen | null>(null);

  // 로그인 확인과 불러오기, 지우기는 recordDetailScreen.ts가 맡습니다.
  // 화면을 떠나면 진행 중인 요청을 취소합니다.
  useEffect(() => {
    const screen = createRecordDetailScreen(id, {
      onView: setView,
      onExit: (to) => {
        if (to === "login") {
          // 로그인하면 이 기록으로 돌아옵니다.
          appActions.prepareLogin(`/records/${id}`);
          navigate("/login", { replace: true });
          return;
        }
        navigate("/records", { replace: true });
      },
    });
    screenRef.current = screen;
    void screen.load();
    return () => {
      screen.dispose();
      screenRef.current = null;
    };
  }, [id, navigate]);

  if (view.phase === "notFound") {
    return (
      <>
        <PageTitle>기록을 찾을 수 없어요</PageTitle>
        <Card>지워졌거나 저장되지 않은 기록이에요.</Card>
        <ActionLink to="/records">내 기록으로 돌아가기</ActionLink>
      </>
    );
  }
  if (view.phase !== "ready" || !view.record) {
    return (
      <>
        <PageTitle>저장된 요약지</PageTitle>
        {view.phase === "error" ? (
          <>
            <WarningNotice>{view.message ?? ""}</WarningNotice>
            <div className="flex flex-col gap-3">
              <Button onClick={() => void screenRef.current?.load()}>
                다시 시도
              </Button>
              <ActionLink to="/records" variant="quiet">
                내 기록으로 돌아가기
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

  const { record } = view;
  const date = formatRecordDate(record.createdAt);
  return (
    <>
      <PageTitle
        description={`${date}에 만든 요약지예요. 진료실에서 그대로 보여 줄 수 있어요.`}
      >
        저장된 요약지
      </PageTitle>
      <SummaryDocument
        summary={record.summary}
        caption={`내 기록 · ${date} 저장`}
        large={large}
      />
      <div className="flex flex-col gap-3">
        <Button
          aria-pressed={large}
          onClick={() => setLarge((value) => !value)}
        >
          글자 크게 보여주기
        </Button>
        <ActionLink to="/records" variant="outline">
          내 기록으로 돌아가기
        </ActionLink>
        <Button variant="quiet" onClick={() => setConfirming(true)}>
          이 기록 지우기
        </Button>
        {confirming && (
          <>
            {view.deleteMessage && (
              <WarningNotice>{view.deleteMessage}</WarningNotice>
            )}
            <InlineConfirm
              message="이 기록을 지울까요? 지운 기록은 되돌릴 수 없어요."
              busy={view.deleting}
              onCancel={() => setConfirming(false)}
              onConfirm={() => void screenRef.current?.remove()}
            />
          </>
        )}
      </div>
    </>
  );
}
