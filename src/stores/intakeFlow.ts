import type { YesNoUnknown } from "@/api/enums";
import type { IntakeOption, IntakeQuestion } from "@/api/intakes";

// S04a가 문진 응답(POST /api/intakes, GET·POST /api/intakes/{intakeId}…)의 질문을 그릴 때 쓰는 도우미입니다.
// 응답의 모양은 src/api/intakes.ts의 타입을 그대로 씁니다.
export type { IntakeOption, IntakeQuestion };

// 못 알아들어 같은 질문을 다시 묻거나(reask: true) 음성 인식이 STT_422로 실패했을 때 보여 주는 안내입니다.
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
