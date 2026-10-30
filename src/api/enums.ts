// 노션 API 목록 "공통 규칙 (10/30 확정)"의 enum 목록입니다.
// 서버가 보내고 받는 값은 UPPER_SNAKE_CASE이고, 화면 문구는 각 화면에서 정합니다.

export const inputModes = ["VOICE", "TEXT", "BUTTON"] as const;
export type InputMode = (typeof inputModes)[number];

export const intakeStatuses = [
  "IN_PROGRESS",
  "EMERGENCY",
  "COMPLETED",
  "CANCELED",
] as const;
export type IntakeStatus = (typeof intakeStatuses)[number];

// SYMPTOM은 최대 7개, BASIC_INFO는 5개 질문입니다.
export const intakeStages = ["SYMPTOM", "BASIC_INFO"] as const;
export type IntakeStage = (typeof intakeStages)[number];

export const answerTypes = [
  "YES_NO_UNKNOWN",
  "SINGLE_CHOICE",
  "FREE_TEXT",
] as const;
export type AnswerType = (typeof answerTypes)[number];

export const yesNoUnknownAnswers = ["YES", "NO", "UNKNOWN"] as const;
export type YesNoUnknown = (typeof yesNoUnknownAnswers)[number];

export const bodyParts = [
  "HEAD",
  "CHEST",
  "ABDOMEN",
  "BACK",
  "ARM_SHOULDER",
  "LEG_KNEE",
  "SKIN",
  "ETC",
] as const;
export type BodyPart = (typeof bodyParts)[number];

export const onsets = ["TODAY", "DAYS_2_3", "OVER_WEEK"] as const;
export type Onset = (typeof onsets)[number];

export const ageGroups = [
  "UNDER_50",
  "SIXTIES",
  "SEVENTIES",
  "OVER_80",
] as const;
export type AgeGroup = (typeof ageGroups)[number];

export const genders = ["MALE", "FEMALE"] as const;
export type Gender = (typeof genders)[number];

export const summaryStatuses = ["GENERATING", "DONE", "FAILED"] as const;
export type SummaryStatus = (typeof summaryStatuses)[number];

// S06a에 보이는 요약지 생성 단계와 단계별 상태입니다.
export const summarySteps = [
  "BASIC_INFO",
  "SYMPTOM",
  "HEALTH_INFO",
  "DEPARTMENT",
] as const;
export type SummaryStep = (typeof summarySteps)[number];

export const summaryStepStatuses = ["WAITING", "IN_PROGRESS", "DONE"] as const;
export type SummaryStepStatus = (typeof summaryStepStatuses)[number];

export const relations = ["SPOUSE", "SON", "DAUGHTER", "ETC"] as const;
export type Relation = (typeof relations)[number];

export const consentTypes = ["RECORD", "GUARDIAN"] as const;
export type ConsentType = (typeof consentTypes)[number];

export const redFlagCategories = [
  "CHEST_PAIN",
  "BREATHING",
  "STROKE",
  "CONSCIOUSNESS",
  "BLEEDING",
] as const;
export type RedFlagCategory = (typeof redFlagCategories)[number];

// 서버 응답 값이 목록에 있는지 확인할 때 씁니다.
export function isEnumValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (values as readonly string[]).includes(value)
  );
}
