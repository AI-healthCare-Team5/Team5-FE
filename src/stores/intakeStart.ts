import type { BodyPart, InputMode, Onset } from "@/api/enums";
import type { Interview } from "@/stores/model";

// POST /api/intakes 요청 본문입니다. 실제 호출과 src/api의 타입은 #26에서 연결합니다.
export interface IntakeStartRequest {
  inputMode: InputMode;
  // VOICE·TEXT일 때 필수입니다. BUTTON일 때는 "더 알려주실 내용"입니다.
  text?: string;
  // BUTTON일 때 필수입니다.
  bodyPart?: BodyPart;
  // BUTTON일 때 필수입니다.
  onset?: Onset;
}

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
): IntakeStartRequest | null {
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
