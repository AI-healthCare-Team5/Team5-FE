import type { IntakeOption } from "@/stores/intakeFlow";
import { addSampleAnswer, type SampleAnswer } from "@/stores/sampleIntake";

// S04a에서 답한 내용과, 이전 질문으로 돌아왔을 때 다시 눌러 둘 답입니다.
export interface QuestionAnswersState {
  answers: SampleAnswer[];
  restoredCode: string | null;
}

export type QuestionAnswersAction =
  | { type: "answer"; questionId: string; choice: IntakeOption }
  | { type: "back" };

export const initialQuestionAnswers: QuestionAnswersState = {
  answers: [],
  restoredCode: null,
};

// 답하면 다음 질문으로 넘어가고, 이전 질문으로 가면 서버처럼 직전 답을 지우되 화면에는 그 답을 다시 눌러 둡니다.
export function questionAnswersReducer(
  state: QuestionAnswersState,
  action: QuestionAnswersAction,
): QuestionAnswersState {
  if (action.type === "answer") {
    return {
      answers: addSampleAnswer(state.answers, action.questionId, action.choice),
      restoredCode: null,
    };
  }
  const previous = state.answers.at(-1);
  if (!previous) {
    return state;
  }
  return {
    answers: state.answers.slice(0, -1),
    restoredCode: previous.code,
  };
}
