import { describe, expect, it } from "vitest";
import {
  initialQuestionAnswers,
  questionAnswersReducer,
  type QuestionAnswersAction,
} from "@/pages/text-input/questionAnswers";
import { createSampleIntakeView } from "@/stores/sampleIntake";

const start = {
  inputMode: "BUTTON",
  bodyPart: "HEAD",
  onset: "TODAY",
} as const;

function run(actions: QuestionAnswersAction[]) {
  return actions.reduce(questionAnswersReducer, initialQuestionAnswers);
}

describe("questionAnswersReducer", () => {
  it("답 → 다음 질문 → 이전 질문이면 직전 답을 지우고 그 답을 다시 눌러 둔다", () => {
    const state = run([
      {
        type: "answer",
        questionId: "q_age_group",
        choice: { code: "SIXTIES", label: "60대" },
      },
      {
        type: "answer",
        questionId: "q_gender",
        choice: { code: "FEMALE", label: "여성" },
      },
      { type: "back" },
    ]);
    const view = createSampleIntakeView(start, state.answers);

    expect(state.restoredCode).toBe("FEMALE");
    expect(view.progress).toEqual({ current: 2, total: 5 });
    expect(view.question?.questionId).toBe("q_gender");
    expect(view.collected).toEqual(["머리", "오늘", "나이대: 60대"]);
  });

  it("다시 답하면 눌러 둔 답을 지우고 다음 질문으로 넘어간다", () => {
    const state = run([
      {
        type: "answer",
        questionId: "q_age_group",
        choice: { code: "SIXTIES", label: "60대" },
      },
      { type: "back" },
      {
        type: "answer",
        questionId: "q_age_group",
        choice: { code: "SEVENTIES", label: "70대" },
      },
    ]);
    const view = createSampleIntakeView(start, state.answers);

    expect(state.restoredCode).toBeNull();
    expect(view.question?.questionId).toBe("q_gender");
    expect(view.collected).toContain("나이대: 70대");
    expect(view.collected).not.toContain("나이대: 60대");
  });

  it("답이 없을 때 이전 질문은 상태를 바꾸지 않는다", () => {
    expect(run([{ type: "back" }])).toBe(initialQuestionAnswers);
  });
});
