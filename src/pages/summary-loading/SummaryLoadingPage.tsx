import { useNavigate } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";
import { ScreenIcon, Spinner } from "@/components/ScreenElements";
import { Button, Card, Notice, PageTitle } from "@/components/ui";
const stages = [
  "나이대 · 성별 정리",
  "증상과 기간 정리",
  "복용약 · 병력 정리",
  "진료과 확인",
  "요약지 완성",
];
export function SummaryLoadingPage() {
  // 실제 완료 신호는 API 연동 단계에서 연결합니다.
  const stage = 3;
  const navigate = useNavigate();
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-start gap-5"
      >
        <Spinner />
        <PageTitle description="말씀하신 내용을 정리하고 있어요. 보통 몇 초 걸려요.">
          요약지를
          <br />
          만드는 중이에요
        </PageTitle>
        <span className="sr-only">{stages[stage]} 하는 중</span>
      </div>
      <Card>
        <ol className="flex flex-col gap-4">
          {stages.map((text, index) => (
            <li key={text} className="flex flex-wrap items-center gap-[14px]">
              <span
                aria-hidden="true"
                className={`grid size-[28px] shrink-0 place-items-center rounded-full ${index < stage ? "bg-success-soft" : index === stage ? "bg-brand" : "border-2 border-line"}`}
              >
                {index < stage ? (
                  <ScreenIcon name="check" size={18} />
                ) : index === stage ? (
                  <span className="size-[10px] rounded-full bg-white" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">{text}</span>
              <span
                className={`text-[0.889rem] ${index < stage ? "text-success" : index === stage ? "font-bold text-brand-strong" : "text-subtle"}`}
              >
                {index < stage ? "완료" : index === stage ? "하는 중" : "대기"}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Notice>
        <span className="flex items-start gap-3">
          <DesignIcon name="info" />
          <span>요약지가 나오면 잘못된 내용을 직접 고칠 수 있어요.</span>
        </span>
      </Notice>
      <Button variant="quiet" onClick={() => navigate("/", { replace: true })}>
        취소하고 처음으로
      </Button>
    </>
  );
}
