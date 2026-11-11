import { describe, expect, it } from "vitest";
import { yesNoUnknownAnswers } from "@/api/enums";
import {
  answerChoices,
  canAnswerNone,
  type IntakeQuestion,
} from "@/stores/intakeFlow";

const base: IntakeQuestion = {
  questionId: "q_test",
  text: "테스트 질문",
  answerType: "SINGLE_CHOICE",
  options: [
    { code: "A", label: "가" },
    { code: "B", label: "나" },
  ],
};

describe("answerChoices", () => {
  it("SINGLE_CHOICE는 서버가 준 options를 그대로 쓴다", () => {
    expect(answerChoices(base)).toEqual(base.options);
    expect(answerChoices({ ...base, options: null })).toEqual([]);
  });

  it("YES_NO_UNKNOWN은 options 없이 YES·NO·UNKNOWN 버튼을 만든다", () => {
    const choices = answerChoices({
      ...base,
      answerType: "YES_NO_UNKNOWN",
      options: null,
    });

    expect(choices.map((choice) => choice.code)).toEqual([
      ...yesNoUnknownAnswers,
    ]);
    expect(choices.map((choice) => choice.label)).toEqual([
      "네",
      "아니요",
      "잘 모르겠어요",
    ]);
  });

  it("FREE_TEXT는 버튼으로 답할 수 없어서 선택지가 없다", () => {
    expect(
      answerChoices({ ...base, answerType: "FREE_TEXT", options: null }),
    ).toEqual([]);
  });
});

describe("canAnswerNone", () => {
  const freeText: IntakeQuestion = {
    questionId: "q_medications",
    text: "복용약 질문",
    answerType: "FREE_TEXT",
    options: null,
  };

  it("복용약·앓는 병·알레르기 FREE_TEXT 질문에만 허용한다", () => {
    for (const questionId of ["q_medications", "q_conditions", "q_allergies"]) {
      expect(canAnswerNone({ ...freeText, questionId })).toBe(true);
    }
  });

  it("다른 FREE_TEXT 질문과 선택형 질문에는 허용하지 않는다", () => {
    expect(canAnswerNone({ ...freeText, questionId: "q_other" })).toBe(false);
    expect(canAnswerNone(base)).toBe(false);
    expect(
      canAnswerNone({
        ...base,
        questionId: "q_gender",
        answerType: "YES_NO_UNKNOWN",
        options: null,
      }),
    ).toBe(false);
  });
});
