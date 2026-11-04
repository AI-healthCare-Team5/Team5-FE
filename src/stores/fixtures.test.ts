import { describe, expect, it } from "vitest";
import { buildSummaryRows } from "@/components/summary/summaryRows";
import { createSampleRecords, sampleSummary } from "@/stores/fixtures";

const valueOf = (
  summary: Parameters<typeof buildSummaryRows>[0],
  key: string,
) => buildSummaryRows(summary).find((row) => row.key === key)?.value;

describe("예시 요약지와 기록", () => {
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

  it("기록 3건은 서로 다른 id를 가진 서버 요약지 모양이다", () => {
    const records = createSampleRecords();

    expect(records).toHaveLength(3);
    expect(new Set(records.map((record) => record.id)).size).toBe(3);
    for (const record of records) {
      expect(typeof record.summary.mainSymptom).toBe("string");
      expect(record.summary.department.departmentName).not.toBe("");
      expect(Array.isArray(record.summary.items)).toBe(true);
    }
  });

  it("기록을 고쳐도 예시 요약지와 다른 기록이 바뀌지 않는다", () => {
    const [knee, cough] = createSampleRecords();
    knee.summary.items[0].value = "없음";
    knee.summary.department.departmentName = "OO";

    expect(sampleSummary.items[0].value).toBe("있음");
    expect(sampleSummary.department.departmentName).toBe("정형외과");
    expect(cough.summary.department.departmentName).toBe("내과");
  });

  it("못 물은 항목(null)과 없다고 한 항목([])이 모두 들어 있다", () => {
    const summaries = createSampleRecords().map((record) => record.summary);
    const lists = summaries.flatMap((summary) => [
      summary.medications,
      summary.conditions,
      summary.allergies,
    ]);

    expect(lists).toContain(null);
    expect(lists.some((list) => Array.isArray(list) && list.length === 0)).toBe(
      true,
    );
  });

  it("null은 '확인 못 했어요', []는 '없음'으로 보인다", () => {
    const [, cough, dizziness] = createSampleRecords();

    expect(valueOf(cough.summary, "medications")).toBe("없음");
    expect(valueOf(dizziness.summary, "medications")).toBe("확인 못 했어요");
    expect(valueOf(dizziness.summary, "conditions")).toBe("확인 못 했어요");
    expect(valueOf(dizziness.summary, "allergies")).toBe("없음");
  });
});
