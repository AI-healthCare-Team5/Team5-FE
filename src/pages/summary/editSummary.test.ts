import { describe, expect, it } from "vitest";
import {
  applySummaryEdits,
  canSaveEdits,
  initialEdits,
} from "@/pages/summary/editSummary";
import { sampleSummary } from "@/pages/summary/sampleSummary";

const confirmed = { ...sampleSummary, isConfirmed: true };

describe("applySummaryEdits", () => {
  it("고치면 확인 상태가 다시 false가 된다", () => {
    const next = applySummaryEdits(confirmed, initialEdits(confirmed));
    expect(next.isConfirmed).toBe(false);
  });

  it("고친 칸만 바뀌고 진료과와 건강 정보는 그대로다", () => {
    const edits = {
      ...initialEdits(confirmed),
      mainSymptom: " 오른쪽 무릎 통증 ",
    };
    const next = applySummaryEdits(confirmed, edits);
    expect(next.mainSymptom).toBe("오른쪽 무릎 통증");
    expect(next.department).toEqual(confirmed.department);
    expect(next.medications).toEqual(confirmed.medications);
    expect(next.ageGroup).toBe("SEVENTIES");
  });

  it("비운 칸은 null로 바꾸고 증상별 항목은 order로 찾아 바꾼다", () => {
    const edits = {
      ...initialEdits(confirmed),
      onsetDetail: "  ",
      itemValues: { 1: "조금 있음", 2: "" },
    };
    const next = applySummaryEdits(confirmed, edits);
    expect(next.onsetDetail).toBeNull();
    expect(next.items.map((item) => item.value)).toEqual(["조금 있음", null]);
  });

  it("주된 증상을 비우면 저장할 수 없다", () => {
    expect(
      canSaveEdits({ ...initialEdits(confirmed), mainSymptom: "   " }),
    ).toBe(false);
    expect(canSaveEdits(initialEdits(confirmed))).toBe(true);
  });
});
