import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { InlineConfirm } from "@/components/InlineConfirm";
import { StoredSummary } from "@/pages/records/components/StoredSummary";
import { formatRecordDate } from "@/pages/records/formatRecordDate";
import { ActionLink, Button, Card, PageTitle } from "@/components/ui";
import { appActions, useAppStore } from "@/stores/appStore";

export function RecordDetailPage() {
  const { id } = useParams();
  const { loggedIn, records } = useAppStore();
  const [large, setLarge] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }
  const record = records.find((item) => item.id === id);
  if (!record) {
    return (
      <>
        <PageTitle>기록을 찾을 수 없어요</PageTitle>
        <Card>지워졌거나 저장되지 않은 기록이에요.</Card>
        <ActionLink to="/records">내 기록으로 돌아가기</ActionLink>
      </>
    );
  }
  return (
    <>
      <PageTitle
        description={`${formatRecordDate(record.createdAt)}에 만든 요약지예요. 진료실에서 그대로 보여 줄 수 있어요.`}
      >
        저장된 요약지
      </PageTitle>
      <StoredSummary
        summary={record.summary}
        date={formatRecordDate(record.createdAt)}
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
          <InlineConfirm
            message="이 기록을 지울까요? 지운 기록은 되돌릴 수 없어요."
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              appActions.deleteRecord(record.id);
              navigate("/records", { replace: true });
            }}
          />
        )}
      </div>
    </>
  );
}
