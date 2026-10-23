import { Card, Disclaimer } from "@/components/ui";
import type { SummaryData } from "@/stores/model";

export function SummaryDocument({ summary }: { summary: SummaryData }) {
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
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="bg-ink p-4 text-white">
          <h2 className="text-[1.222rem] font-bold">진료 요약지</h2>
          <p className="text-[0.833rem]">의사 선생님께 보여주세요</p>
        </div>
        <dl className="divide-y divide-line px-4">
          {items.map(([title, value]) => (
            <div key={title} className="py-4">
              <dt className="mb-1 text-[0.833rem] text-muted">{title}</dt>
              <dd
                className={`font-semibold ${title === "안내된 진료과" ? "text-brand-strong" : ""}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      <Disclaimer />
    </div>
  );
}
