import { describe, expect, it } from "vitest";
import { yesNoUnknownAnswers } from "@/api/enums";
import { answerChoices, type IntakeQuestion } from "@/stores/intakeFlow";

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
