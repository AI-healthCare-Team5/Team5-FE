import { Disclaimer } from "@/components/ui";
import { buildSummaryRows } from "@/components/summary/summaryRows";
import type { SummaryContent } from "@/components/summary/types";

// S06 요약지와 H02 기록 상세가 함께 씁니다. 데이터와 머리말 문구만 props로 받습니다.
export function SummaryDocument({
  summary,
  caption,
  large = false,
}: {
  summary: SummaryContent;
  caption: string;
  large?: boolean;
}) {
  const rows = buildSummaryRows(summary);
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className="bg-ink px-5 py-4 text-white">
        <h2
          className={`font-bold ${large ? "text-[1.358rem]" : "text-[1.111rem]"}`}
        >
          진료 요약지
        </h2>
        <p
          className={`text-brand-ring ${large ? "text-[1.086rem]" : "text-[0.889rem]"}`}
        >
          {caption}
        </p>
      </div>
      <dl className="divide-y divide-line px-5">
        {rows.map(({ key, label, value }) => (
          <div key={key} className="py-4">
            <dt
              className={`mb-1 font-medium text-subtle ${large ? "text-[1.086rem]" : "text-[0.889rem]"}`}
            >
              {label}
            </dt>
            <dd
              className={`font-bold break-words ${large ? "text-[1.358rem]" : "text-[1.111rem]"} ${key === "department" ? "text-brand-strong" : ""}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-line bg-notice px-5 py-4">
        <Disclaimer />
      </div>
    </div>
  );
}
