import type { YesNoUnknown } from "@/api/enums";
import type { IntakeOption, IntakeQuestion } from "@/api/intakes";

// S04a가 문진 응답(POST /api/intakes, GET·POST /api/intakes/{intakeId}…)의 질문을 그릴 때 쓰는 도우미입니다.
// 응답의 모양은 src/api/intakes.ts의 타입을 그대로 씁니다.
export type { IntakeOption, IntakeQuestion };

// 못 알아들어 같은 질문을 다시 묻거나(reask: true) 음성 인식이 STT_422로 실패했을 때 보여 주는 안내 문구입니다.
// 화면에는 ReaskNotice가 이 상수로 그리고, sttFailure의 message도 같은 상수를 씁니다.
export const REASK_MESSAGE = "다시 말씀해 주세요";

// YES_NO_UNKNOWN 질문은 options가 null이라 버튼 문구를 화면에서 정합니다. S03의 선택지와 같은 문구입니다.
const yesNoUnknownOptions: { code: YesNoUnknown; label: string }[] = [
  { code: "YES", label: "네" },
  { code: "NO", label: "아니요" },
  { code: "UNKNOWN", label: "잘 모르겠어요" },
];

// 버튼으로 답할 수 있는 선택지입니다. FREE_TEXT는 말·글로만 답할 수 있어서 버튼이 없습니다.
export function answerChoices(question: IntakeQuestion): IntakeOption[] {
  switch (question.answerType) {
    case "YES_NO_UNKNOWN":
      return yesNoUnknownOptions;
    case "SINGLE_CHOICE":
      return question.options ?? [];
    case "FREE_TEXT":
      return [];
  }
}

// 서버가 "없으면 없어요라고 해 주세요"라고 안내하는 기본 정보 질문(복용약·앓는 병·알레르기)입니다.
// 서버 BasicInfoQuestions의 questionId이며, 다른 질문은 "없어요"가 없음 답으로 정해져 있지 않습니다.
const noneAnswerQuestionIds: readonly string[] = [
  "q_medications",
  "q_conditions",
  "q_allergies",
];

// 이 질문에 "없어요" 버튼을 보여 줄지 알려 줍니다. FREE_TEXT는 버튼 답(BUTTON)을 받지 않으므로 글로 보냅니다.
export function canAnswerNone(question: IntakeQuestion): boolean {
  return (
    question.answerType === "FREE_TEXT" &&
    noneAnswerQuestionIds.includes(question.questionId)
  );
}

// 사용자가 명시적으로 답한 없음입니다. 서버가 이 글을 []로 정리하고, 답하지 않은 항목(null)과 구분합니다.
export const NONE_ANSWER = "없어요";
