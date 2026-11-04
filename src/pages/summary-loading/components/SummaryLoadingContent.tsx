import { ScreenIcon, Spinner } from "@/components/ScreenElements";
import { WarningNotice } from "@/components/WarningNotice";
import { Button, Card, PageTitle } from "@/components/ui";
import { buildStepRows } from "@/pages/summary-loading/stepRows";
import type { SummaryLoadingView } from "@/pages/summary-loading/summaryLoading";

// 서버가 FAILED로 응답했거나 30초 안에 끝나지 않았을 때의 안내입니다.
const retryMessages = {
  failed: "요약지를 만드는 중 문제가 생겼어요. ‘다시 만들기’를 눌러 주세요.",
  timeout:
    "요약지를 만드는 데 시간이 오래 걸리고 있어요. ‘다시 만들기’를 눌러 주세요.",
} as const;

export function SummaryLoadingContent({
  view,
  onRetry,
  onCancel,
}: {
  view: SummaryLoadingView;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const polling = view.phase === "polling";
  const stopped = view.phase === "needsRetry";
  const rows = buildStepRows(view.steps);
  const current = rows.find((row) => row.status === "IN_PROGRESS");

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-start gap-5"
      >
        {polling && <Spinner />}
        <PageTitle
          description={polling ? "요약지 안내를 준비 중이에요." : undefined}
        >
          {stopped ? (
            <>
              요약지를
              <br />
              만들지 못했어요
            </>
          ) : (
            <>
              요약지를
              <br />
              만드는 중이에요
            </>
          )}
        </PageTitle>
        {polling && current && (
          <span className="sr-only">{current.label} 하는 중</span>
        )}
      </div>
      {polling ? (
        <Card>
          <ol className="flex flex-col gap-4">
            {rows.map((row) => (
              <li
                key={row.step}
                className="flex flex-wrap items-center gap-3.5"
              >
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${row.status === "DONE" ? "bg-success-soft" : row.status === "IN_PROGRESS" ? "bg-brand" : "border-2 border-line"}`}
                >
                  {row.status === "DONE" ? (
                    <ScreenIcon name="check" size={18} />
                  ) : row.status === "IN_PROGRESS" ? (
                    <span className="size-2.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">{row.label}</span>
                <span
                  className={`text-[0.889rem] ${row.status === "DONE" ? "text-success" : row.status === "IN_PROGRESS" ? "font-bold text-brand-strong" : "text-subtle"}`}
                >
                  {row.statusText}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <WarningNotice>
          {stopped && view.reason
            ? retryMessages[view.reason]
            : (view.message ?? "")}
        </WarningNotice>
      )}
      {view.cancelMessage && (
        <WarningNotice>{view.cancelMessage}</WarningNotice>
      )}
      <div className="flex flex-col gap-3">
        {!polling && (
          <Button disabled={view.busy} onClick={onRetry}>
            {stopped ? "다시 만들기" : "다시 시도"}
          </Button>
        )}
        <Button
          variant={stopped ? "outline" : "quiet"}
          disabled={view.busy}
          onClick={onCancel}
        >
          {stopped ? "처음으로" : "취소하고 처음으로"}
        </Button>
      </div>
    </>
  );
}
