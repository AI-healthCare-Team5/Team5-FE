import { beforeEach, describe, expect, it } from "vitest";
import type { IntakeResponse } from "@/api/intakes";
import {
  beginIntakeSession,
  clearIntakeSession,
  readIntakeSession,
  rememberAnswer,
  resetIntakeFlow,
  updateIntakeSession,
} from "@/stores/intakeSession";
import {
  readSummarySession,
  saveSummarySession,
} from "@/stores/summarySession";

// 모든 값은 가짜 데이터입니다.
function intake(overrides: Partial<IntakeResponse> = {}): IntakeResponse {
  return {
    intakeId: "intake-1",
    status: "IN_PROGRESS",
    stage: "BASIC_INFO",
    progress: { current: 1, total: 5 },
    collected: ["머리", "오늘"],
    question: {
      questionId: "q_age_group",
      text: "연세가 어떻게 되세요?",
      answerType: "SINGLE_CHOICE",
      options: [{ code: "SIXTIES", label: "60대" }],
    },
    reask: false,
    emergency: null,
    department: null,
    summaryId: null,
    ...overrides,
  };
}

beforeEach(() => {
  resetIntakeFlow();
});

describe("문진 기억", () => {
  it("시작하기 전에는 아무것도 없다", () => {
    expect(readIntakeSession()).toBeNull();
  });

  it("시작한 문진을 읽을 수 있다", () => {
    beginIntakeSession(intake());

    expect(readIntakeSession()).toEqual({ intake: intake(), answers: {} });
  });

  it("서버가 알려 준 새 상태로 바꾼다", () => {
    beginIntakeSession(intake());
    const next = intake({ progress: { current: 2, total: 5 } });

    updateIntakeSession(next);

    expect(readIntakeSession()?.intake).toEqual(next);
  });

  it("다른 문진의 응답은 무시한다", () => {
    beginIntakeSession(intake());

    updateIntakeSession(
      intake({ intakeId: "intake-2", progress: { current: 3, total: 5 } }),
    );

    expect(readIntakeSession()?.intake.intakeId).toBe("intake-1");
    expect(readIntakeSession()?.intake.progress.current).toBe(1);
  });

  it("문진이 없을 때 바꾸려 해도 만들지 않는다", () => {
    updateIntakeSession(intake());
    rememberAnswer("intake-1", "q_age_group", {
      inputMode: "BUTTON",
      answer: "SIXTIES",
    });

    expect(readIntakeSession()).toBeNull();
  });

  it("질문마다 마지막 답을 기억하고, 다시 답하면 덮어쓴다", () => {
    beginIntakeSession(intake());

    rememberAnswer("intake-1", "q_age_group", {
      inputMode: "BUTTON",
      answer: "SIXTIES",
    });
    rememberAnswer("intake-1", "q_medications", {
      inputMode: "TEXT",
      answer: "없어요",
    });
    rememberAnswer("intake-1", "q_age_group", {
      inputMode: "BUTTON",
      answer: "SEVENTIES",
    });

    expect(readIntakeSession()?.answers).toEqual({
      q_age_group: { inputMode: "BUTTON", answer: "SEVENTIES" },
      q_medications: { inputMode: "TEXT", answer: "없어요" },
    });
  });

  it("다른 문진의 답은 기억하지 않는다", () => {
    beginIntakeSession(intake());

    rememberAnswer("intake-2", "q_age_group", {
      inputMode: "BUTTON",
      answer: "SIXTIES",
    });

    expect(readIntakeSession()?.answers).toEqual({});
  });

  it("읽은 값을 바꿔도 기억한 값은 그대로다", () => {
    beginIntakeSession(intake());
    rememberAnswer("intake-1", "q_age_group", {
      inputMode: "BUTTON",
      answer: "SIXTIES",
    });

    const read = readIntakeSession();
    if (!read) throw new Error("문진이 있어야 해요");
    read.answers.q_age_group.answer = "바뀜";
    delete read.answers.q_age_group;

    expect(readIntakeSession()?.answers.q_age_group?.answer).toBe("SIXTIES");
  });

  it("새 문진을 시작하면 이전 답과 이전 요약지 ID를 지운다", () => {
    beginIntakeSession(intake());
    rememberAnswer("intake-1", "q_age_group", {
      inputMode: "BUTTON",
      answer: "SIXTIES",
    });
    saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });

    beginIntakeSession(intake({ intakeId: "intake-2" }));

    expect(readIntakeSession()).toEqual({
      intake: intake({ intakeId: "intake-2" }),
      answers: {},
    });
    expect(readSummarySession()).toBeNull();
  });

  it("지우면 문진만 사라지고 요약지 ID는 그대로다", () => {
    beginIntakeSession(intake());
    saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });

    clearIntakeSession();

    expect(readIntakeSession()).toBeNull();
    expect(readSummarySession()).toEqual({
      intakeId: "intake-1",
      summaryId: "summary-1",
    });
  });

  it("흐름을 처음부터 다시 시작하면 문진과 요약지 ID를 모두 지운다", () => {
    beginIntakeSession(intake());
    saveSummarySession({ intakeId: "intake-1", summaryId: "summary-1" });

    resetIntakeFlow();

    expect(readIntakeSession()).toBeNull();
    expect(readSummarySession()).toBeNull();
  });
});
