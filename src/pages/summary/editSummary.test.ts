import { describe, expect, it } from "vitest";
import {
  applySummaryEdits,
  buildSummaryUpdate,
  canSaveEdits,
  initialEdits,
  newHealthEntry,
} from "@/pages/summary/editSummary";
import { sampleSummary } from "@/stores/fixtures";

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

  it("추가 내용을 고치고, 비우면 null(지움)이 된다", () => {
    const withNote = { ...confirmed, extraNote: "밤에 더 아파요" };
    expect(initialEdits(withNote).extraNote).toBe("밤에 더 아파요");
    const changed = {
      ...initialEdits(withNote),
      extraNote: " 계단에서 아파요 ",
    };
    expect(applySummaryEdits(withNote, changed).extraNote).toBe(
      "계단에서 아파요",
    );
    const cleared = { ...initialEdits(withNote), extraNote: "" };
    expect(applySummaryEdits(withNote, cleared).extraNote).toBeNull();
  });

  it("건강 정보 항목 키는 서로 겹치지 않는다", () => {
    expect(newHealthEntry().id).not.toBe(newHealthEntry().id);
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

describe("buildSummaryUpdate", () => {
  it("아무것도 고치지 않으면 빈 객체라 보낼 것이 없다", () => {
    expect(buildSummaryUpdate(confirmed, initialEdits(confirmed))).toEqual({});
  });

  it("고친 칸만 담고 안 고친 칸은 보내지 않는다", () => {
    const edits = {
      ...initialEdits(confirmed),
      mainSymptom: " 오른쪽 무릎 통증 ",
    };

    const request = buildSummaryUpdate(confirmed, edits);

    expect(request).toEqual({ mainSymptom: "오른쪽 무릎 통증" });
    for (const key of [
      "ageGroup",
      "gender",
      "onset",
      "onsetDetail",
      "extraNote",
      "medications",
      "conditions",
      "allergies",
      "items",
    ]) {
      expect(key in request).toBe(false);
    }
  });

  it("비운 칸은 null로 보내 지운다", () => {
    const withNote = { ...confirmed, extraNote: "밤에 더 아파요" };
    const edits = {
      ...initialEdits(withNote),
      onsetDetail: "  ",
      extraNote: "",
    };

    expect(buildSummaryUpdate(withNote, edits)).toEqual({
      onsetDetail: null,
      extraNote: null,
    });
  });

  it("증상별 항목은 바꾼 항목만 order와 함께 보낸다", () => {
    const edits = {
      ...initialEdits(confirmed),
      itemValues: { 1: "있음", 2: "" },
    };

    expect(buildSummaryUpdate(confirmed, edits)).toEqual({
      items: [{ order: 2, value: null }],
    });
  });

  it("건강 정보는 바꾼 종류만 통째로 보내고, 모두 지우면 [](없음)이다", () => {
    const edits = initialEdits(confirmed);
    edits.health.allergies = [];
    edits.health.conditions = [
      ...edits.health.conditions,
      newHealthEntry(" 당뇨 ", ""),
    ];

    expect(buildSummaryUpdate(confirmed, edits)).toEqual({
      allergies: [],
      conditions: [
        { name: "고혈압", detail: null },
        { name: "당뇨", detail: null },
      ],
    });
  });

  it("원래 못 물은 항목(null)은 아무것도 넣지 않으면 보내지 않고, 넣으면 목록으로 보낸다", () => {
    const unasked = { ...confirmed, medications: null };
    const untouched = initialEdits(unasked);
    untouched.health.medications = [newHealthEntry("  ", "설명만")];
    expect(buildSummaryUpdate(unasked, untouched)).toEqual({});

    const added = initialEdits(unasked);
    added.health.medications = [newHealthEntry("혈압약", "")];
    expect(buildSummaryUpdate(unasked, added)).toEqual({
      medications: [{ name: "혈압약", detail: null }],
    });
  });

  it("원래 없음([])인 항목은 그대로면 보내지 않고, 항목을 넣으면 보낸다", () => {
    const none = { ...confirmed, conditions: [] };
    expect(buildSummaryUpdate(none, initialEdits(none))).toEqual({});

    const edits = initialEdits(none);
    edits.health.conditions = [newHealthEntry("고혈압", "")];
    expect(buildSummaryUpdate(none, edits)).toEqual({
      conditions: [{ name: "고혈압", detail: null }],
    });
  });

  it("공백만 바꿔 결과가 원래 값과 같으면 보내지 않는다", () => {
    const edits = {
      ...initialEdits(confirmed),
      mainSymptom: "무릎 통증 ",
      itemValues: { 1: " 있음", 2: "없음" },
    };

    expect(buildSummaryUpdate(confirmed, edits)).toEqual({});
  });

  it("지웠다가 같은 내용으로 다시 넣으면 보내지 않는다", () => {
    const edits = initialEdits(confirmed);
    edits.health.medications = [newHealthEntry("혈압약", "매일 아침")];

    expect(buildSummaryUpdate(confirmed, edits)).toEqual({});
  });
});
