import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { InlineConfirm } from "@/components/InlineConfirm";
import { SummaryDocument } from "@/components/summary/SummaryDocument";
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
      <PageTitle description="저장된 기록은 읽기 전용이에요.">
        진료 기록
      </PageTitle>
      <p className="text-[0.889rem] text-muted">
        {new Date(record.createdAt).toLocaleDateString("ko-KR", {
          timeZone: "Asia/Seoul",
        })}
      </p>
      <div style={large ? { fontSize: "1.222rem" } : undefined}>
        <SummaryDocument summary={record.summary} />
      </div>
      <Button
        variant="outline"
        aria-pressed={large}
        onClick={() => setLarge((value) => !value)}
      >
        {large ? "원래 크기로 보기" : "글자 크게 보기"}
      </Button>
      <Button variant="outline" onClick={() => setConfirming(true)}>
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
      <ActionLink to="/records" variant="quiet">
        내 기록으로 돌아가기
      </ActionLink>
    </>
  );
}
