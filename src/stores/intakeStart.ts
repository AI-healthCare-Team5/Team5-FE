import type { BodyPart, InputMode, Onset } from "@/api/enums";
import type { Interview } from "@/stores/model";

// VOICE·TEXT 입력은 말하거나 적은 내용(text)이 필수입니다.
export interface FreeIntakeStartRequest {
  inputMode: Exclude<InputMode, "BUTTON">;
  text: string;
}

// BUTTON 입력은 부위와 시작 시점이 필수이고, text는 "더 알려주실 내용"입니다.
export interface ButtonIntakeStartRequest {
  inputMode: "BUTTON";
  bodyPart: BodyPart;
  onset: Onset;
  text?: string;
}

// POST /api/intakes 요청 본문입니다. src/api/intakes.ts의 IntakeStartRequest에 그대로 넘길 수 있습니다.
// inputMode로 필수 필드를 나눠, 필수 값이 빠진 요청은 타입 검사에서 막습니다.
export type IntakeStartRequest =
  FreeIntakeStartRequest | ButtonIntakeStartRequest;

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

// S04 화면에는 label을 보여 주고, 서버에는 value(enum)를 보냅니다.
export const bodyPartOptions: ChoiceOption<BodyPart>[] = [
  { value: "HEAD", label: "머리" },
  { value: "CHEST", label: "가슴" },
  { value: "ABDOMEN", label: "배" },
  { value: "BACK", label: "허리" },
  { value: "ARM_SHOULDER", label: "팔 · 어깨" },
  { value: "LEG_KNEE", label: "다리 · 무릎" },
  { value: "SKIN", label: "피부" },
  { value: "ETC", label: "기타" },
];

export const onsetOptions: ChoiceOption<Onset>[] = [
  { value: "TODAY", label: "오늘" },
  { value: "DAYS_2_3", label: "2~3일" },
  { value: "OVER_WEEK", label: "일주일 이상" },
];

function findValue<T extends string>(
  options: ChoiceOption<T>[],
  label: string | undefined,
): T | undefined {
  return options.find((option) => option.label === label)?.value;
}

// S04에서 고른 답으로 버튼 입력 문진 시작 요청을 만듭니다.
// 부위나 시작 시점을 고르지 않았으면 null입니다. 더 알려주실 내용은 비어 있으면 보내지 않습니다.
export function createButtonIntakeRequest(
  interview: Interview,
): ButtonIntakeStartRequest | null {
  const bodyPart = findValue(bodyPartOptions, interview.symptom);
  const onset = findValue(onsetOptions, interview.duration);
  if (!bodyPart || !onset) {
    return null;
  }
  const text = interview.detail?.trim();
  return {
    inputMode: "BUTTON",
    bodyPart,
    onset,
    ...(text ? { text } : {}),
  };
}
