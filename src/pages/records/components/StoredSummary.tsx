import { Disclaimer } from "@/components/ui";
import type { SummaryData } from "@/stores/model";
export function StoredSummary({
  summary,
  date,
  large,
}: {
  summary: SummaryData;
  date: string;
  large: boolean;
}) {
  const items = [
    ["나이대 · 성별", `${summary.age} · ${summary.gender}`],
    ["주된 증상", summary.symptom],
    ["언제부터", summary.duration],
    ["붓기", summary.swelling],
    ["넘어진 적", summary.fall],
    ["복용 중인 약", summary.medicine],
    ["앓고 있는 병", summary.conditions],
    ["알레르기", summary.allergy],
    ["안내된 진료과", summary.department],
  ];
  return (
    <div
      style={large ? { fontSize: "1.222em" } : undefined}
      className="overflow-hidden rounded-[20px] border border-line bg-surface"
    >
      <div className="bg-ink px-5 py-4 text-white">
        <h2 className="text-[1.111em] font-bold">진료 요약지</h2>
        <p className="text-[0.889em] text-brand-ring">내 기록 · {date} 저장</p>
      </div>
      <dl className="divide-y divide-line px-5">
        {items.map(([label, value]) => (
          <div key={label} className="py-4">
            <dt className="mb-1 text-[0.889em] font-medium text-subtle">
              {label}
            </dt>
            <dd
              className={`text-[1.111em] font-bold ${label === "안내된 진료과" ? "text-brand-strong" : ""}`}
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
