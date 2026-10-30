import { describe, expect, it } from "vitest";
import {
  applySummaryEdits,
  canSaveEdits,
  initialEdits,
  newHealthEntry,
} from "@/pages/summary/editSummary";
import { sampleSummary } from "@/pages/summary/sampleSummary";

const confirmed = { ...sampleSummary, isConfirmed: true };

describe("applySummaryEdits", () => {
  it("고치면 확인 상태가 다시 false가 된다", () => {
    const next = applySummaryEdits(confirmed, initialEdits(confirmed));
    expect(next.isConfirmed).toBe(false);
  });

  it("아무것도 고치지 않으면 확인 상태 말고는 그대로다", () => {
    const next = applySummaryEdits(confirmed, initialEdits(confirmed));
    expect({ ...next, isConfirmed: true }).toEqual(confirmed);
  });

  it("고친 칸만 바뀌고 진료과와 나이대는 그대로다", () => {
    const edits = {
      ...initialEdits(confirmed),
      mainSymptom: " 오른쪽 무릎 통증 ",
    };
    const next = applySummaryEdits(confirmed, edits);
    expect(next.mainSymptom).toBe("오른쪽 무릎 통증");
    expect(next.department).toEqual(confirmed.department);
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

describe("건강 정보 고치기", () => {
  it("항목을 더하고 설명을 비우면 detail이 null이 된다", () => {
    const edits = initialEdits(confirmed);
    edits.health.medications = [
      ...edits.health.medications,
      newHealthEntry(" 당뇨약 ", "  "),
    ];
    expect(applySummaryEdits(confirmed, edits).medications).toEqual([
      { name: "혈압약", detail: "매일 아침" },
      { name: "당뇨약", detail: null },
    ]);
  });

  it("항목을 다 지우면 [](없음)이 된다", () => {
    const edits = initialEdits(confirmed);
    edits.health.allergies = [];
    expect(applySummaryEdits(confirmed, edits).allergies).toEqual([]);
  });

  it("원래 못 물은 항목(null)은 아무것도 넣지 않으면 null로 남는다", () => {
    const unasked = { ...confirmed, conditions: null };
    const edits = initialEdits(unasked);
    edits.health.conditions = [newHealthEntry("", "")];
    expect(applySummaryEdits(unasked, edits).conditions).toBeNull();
  });

  it("이름을 비운 항목은 버린다", () => {
    const edits = initialEdits(confirmed);
    edits.health.conditions = [
      newHealthEntry("   ", "설명만"),
      newHealthEntry("고혈압", ""),
    ];
    expect(applySummaryEdits(confirmed, edits).conditions).toEqual([
      { name: "고혈압", detail: null },
    ]);
  });
});
