import { describe, expect, it } from "vitest";
import type { SummaryStepState } from "@/api/summaries";
import { buildStepRows } from "@/pages/summary-loading/stepRows";

const progress = (
  ...statuses: SummaryStepState["status"][]
): SummaryStepState[] =>
  (["BASIC_INFO", "SYMPTOM", "HEALTH_INFO", "DEPARTMENT"] as const).map(
    (step, index) => ({ step, status: statuses[index] }),
  );

const summarize = (steps: SummaryStepState[] | null) =>
  buildStepRows(steps).map((row) => [row.label, row.statusText]);

describe("만드는 중 단계 표시", () => {
  it("서버 단계 4개를 기존 문구와 대기·하는 중·완료로 보여 준다", () => {
    expect(
      summarize(progress("DONE", "IN_PROGRESS", "WAITING", "WAITING")),
    ).toEqual([
      ["나이대 · 성별 정리", "완료"],
      ["증상과 기간 정리", "하는 중"],
      ["복용약 · 병력 정리", "대기"],
      ["진료과 확인", "대기"],
    ]);
  });

  it("첫 응답 전에는 4단계 모두 대기다", () => {
    const rows = buildStepRows(null);

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.status === "WAITING")).toBe(true);
    expect(rows.every((row) => row.statusText === "대기")).toBe(true);
  });

  it("응답 순서와 관계없이 화면 순서(BASIC_INFO, SYMPTOM, HEALTH_INFO, DEPARTMENT)로 놓는다", () => {
    const shuffled = [...progress("DONE", "DONE", "IN_PROGRESS", "WAITING")];
    shuffled.reverse();

    expect(buildStepRows(shuffled).map((row) => row.step)).toEqual([
      "BASIC_INFO",
      "SYMPTOM",
      "HEALTH_INFO",
      "DEPARTMENT",
    ]);
    expect(buildStepRows(shuffled).map((row) => row.status)).toEqual([
      "DONE",
      "DONE",
      "IN_PROGRESS",
      "WAITING",
    ]);
  });

  it("응답에 없는 단계는 대기로 보여 주고, 모르는 단계는 무시한다", () => {
    const steps = [
      { step: "SYMPTOM", status: "DONE" },
      { step: "UNKNOWN_STEP", status: "IN_PROGRESS" },
    ] as unknown as SummaryStepState[];

    expect(buildStepRows(steps).map((row) => row.status)).toEqual([
      "WAITING",
      "DONE",
      "WAITING",
      "WAITING",
    ]);
  });

  it("모르는 상태값은 대기로 보여 준다", () => {
    const steps = [
      { step: "BASIC_INFO", status: "SOMETHING_NEW" },
    ] as unknown as SummaryStepState[];

    expect(buildStepRows(steps)[0]).toMatchObject({
      status: "WAITING",
      statusText: "대기",
    });
  });

  it("모두 끝나면 4단계 모두 완료다", () => {
    expect(
      buildStepRows(progress("DONE", "DONE", "DONE", "DONE")).every(
        (row) => row.statusText === "완료",
      ),
    ).toBe(true);
  });
});
