import type {
  AnswerType,
  IntakeStage,
  IntakeStatus,
  YesNoUnknown,
} from "@/api/enums";

// 문진 응답(POST /api/intakes, GET·POST /api/intakes/{intakeId}…) 중 S04a가 그리는 필드입니다.
// 실제 API 함수와 src/api의 타입은 #26에서 연결합니다.
export interface IntakeOption {
  // BUTTON으로 답할 때 answer에 넣는 값입니다.
  code: string;
  label: string;
}

export interface IntakeQuestion {
  // 답변할 때 그대로 보냅니다.
  questionId: string;
  text: string;
  answerType: AnswerType;
  // SINGLE_CHOICE일 때만 있고 그 외에는 null입니다.
  options: IntakeOption[] | null;
}

// stage마다 1부터 다시 셉니다. SYMPTOM은 최대 7, BASIC_INFO는 5입니다.
export interface IntakeProgress {
  current: number;
  total: number;
}

export interface IntakeView {
  status: IntakeStatus;
  stage: IntakeStage;
  progress: IntakeProgress;
  // 지금까지 모은 정보입니다. 화면 상단에 보여 줍니다.
  collected: string[];
  // EMERGENCY·COMPLETED면 null입니다.
  question: IntakeQuestion | null;
  // 못 알아들어 같은 질문을 다시 묻는 중이면 true입니다.
  reask: boolean;
}

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
