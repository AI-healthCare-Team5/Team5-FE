import { describe, expect, it } from "vitest";
import { buildSummaryRows } from "@/components/summary/summaryRows";
import { sampleSummary } from "@/stores/fixtures";

const valueOf = (
  summary: Parameters<typeof buildSummaryRows>[0],
  key: string,
) => buildSummaryRows(summary).find((row) => row.key === key)?.value;

describe("예시 요약지", () => {
  it("붓기와 넘어진 적은 items에 있고 옛 필드는 없다", () => {
    expect(sampleSummary.items.map((item) => item.label)).toEqual([
      "붓기",
      "넘어진 적",
    ]);
    for (const key of ["swelling", "fall", "symptom", "duration", "age"]) {
      expect(key in sampleSummary).toBe(false);
    }
    expect(sampleSummary.department.departmentName).toBe("정형외과");
  });

  it("예시 요약지는 확인하기 전 상태다", () => {
    expect(sampleSummary.isConfirmed).toBe(false);
  });

  it("null은 '확인 못 했어요', []는 '없음'으로 보인다", () => {
    const summary = {
      ...sampleSummary,
      medications: null,
      conditions: [],
    };

    expect(valueOf(summary, "medications")).toBe("확인 못 했어요");
    expect(valueOf(summary, "conditions")).toBe("없음");
  });
});
