import type { SummaryContent } from "@/api/summaries";
import { buildSummaryRows } from "@/components/summary/summaryRows";
import { Disclaimer } from "@/components/ui";
export function StoredSummary({
  summary,
  date,
  large,
}: {
  summary: SummaryContent;
  date: string;
  large: boolean;
}) {
  // 못 물은 항목(null)은 "확인 못 했어요", 없다고 한 항목([])은 "없음"으로 S06과 같게 보여 줍니다.
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
          내 기록 · {date} 저장
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
      <div className="border-t border-line px-5 py-4">
        <Disclaimer />
      </div>
    </div>
  );
}
