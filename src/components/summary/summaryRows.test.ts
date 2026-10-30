import { describe, expect, it } from "vitest";
import { buildSummaryRows } from "@/components/summary/summaryRows";
import type { SummaryContent } from "@/components/summary/types";

const base: SummaryContent = {
  ageGroup: "SEVENTIES",
  gender: "FEMALE",
  inputMode: "VOICE",
  mainSymptom: "무릎 통증",
  bodyPart: "LEG_KNEE",
  onset: "DAYS_2_3",
  onsetDetail: "3일 전부터",
  extraNote: null,
  medications: [{ name: "혈압약", detail: "매일 아침" }],
  conditions: [{ name: "고혈압", detail: null }],
  allergies: [{ name: "약", detail: "페니실린" }],
  items: [
    { order: 2, label: "넘어진 적", question: "넘어지셨나요?", value: "없음" },
    { order: 1, label: "붓기", question: "부었나요?", value: "있음" },
  ],
  department: {
    departmentCode: "05",
    departmentName: "정형외과",
    recommendReason: "가짜 이유",
  },
  isConfirmed: false,
};

const labels = (summary: SummaryContent) =>
  buildSummaryRows(summary).map((row) => row.label);
const valueOf = (summary: SummaryContent, key: string) =>
  buildSummaryRows(summary).find((row) => row.key === key)?.value;

describe("buildSummaryRows", () => {
  it("정해진 순서로 놓고 증상별 항목은 order 순으로 끼운다", () => {
    expect(labels(base)).toEqual([
      "나이대 · 성별",
      "주된 증상",
      "언제부터",
      "붓기",
      "넘어진 적",
      "복용 중인 약",
      "앓고 있는 병",
      "알레르기",
      "안내된 진료과",
    ]);
  });

  it("enum은 화면 문구로, 건강 정보는 이름과 설명을 함께 보여 준다", () => {
    expect(valueOf(base, "ageGender")).toBe("70대 · 여성");
    expect(valueOf(base, "medications")).toBe("혈압약 (매일 아침)");
    expect(valueOf(base, "conditions")).toBe("고혈압");
    expect(valueOf(base, "department")).toBe("정형외과");
  });

  it("null은 '확인 못 했어요', []는 '없음'으로 구분한다", () => {
    const summary: SummaryContent = {
      ...base,
      onsetDetail: null,
      medications: null,
      conditions: [],
      department: null,
      items: [{ order: 1, label: "붓기", question: "부었나요?", value: null }],
    };
    expect(valueOf(summary, "onset")).toBe("확인 못 했어요");
    expect(valueOf(summary, "medications")).toBe("확인 못 했어요");
    expect(valueOf(summary, "conditions")).toBe("없음");
    expect(valueOf(summary, "department")).toBe("확인 못 했어요");
    expect(valueOf(summary, "item-1")).toBe("확인 못 했어요");
  });

  it("증상별 항목이 없으면 고정 항목만 보여 준다", () => {
    expect(labels({ ...base, items: [] })).not.toContain("붓기");
    expect(labels({ ...base, items: [] })).toHaveLength(7);
  });

  it("나이대나 성별 하나만 없으면 그쪽만 '확인 못 했어요'로 보여 준다", () => {
    expect(valueOf({ ...base, gender: null }, "ageGender")).toBe(
      "70대 · 확인 못 했어요",
    );
    expect(
      valueOf({ ...base, ageGroup: null, gender: null }, "ageGender"),
    ).toBe("확인 못 했어요");
  });
});
