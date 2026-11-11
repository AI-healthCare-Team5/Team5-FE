import type { Relation } from "@/api/enums";
import type { GuardianInput } from "@/api/guardians";
import type { GuardianOutcome } from "@/stores/memberSession";

// E03에서 입력 중인 보호자 연락처입니다. 동의 내용(C01)을 보고 돌아와도 남도록 앱 상태에 둡니다.
export interface GuardianForm {
  relation: Relation | null;
  // 숫자만 담습니다. 서버도 하이픈 없이 받습니다.
  phoneNumber: string;
  consentAgreed: boolean;
}

export const emptyGuardianForm: GuardianForm = {
  relation: null,
  phoneNumber: "",
  consentAgreed: false,
};

// 화면에는 label을 보여 주고, 서버에는 value(enum)를 보냅니다.
export const relationOptions: { value: Relation; label: string }[] = [
  { value: "SPOUSE", label: "배우자" },
  { value: "SON", label: "아들" },
  { value: "DAUGHTER", label: "딸" },
  { value: "ETC", label: "가족 · 지인" },
];

// 서버 검증과 같은 "숫자 10~11자리"입니다.
const PHONE_MAX_LENGTH = 11;
const phonePattern = /^\d{10,11}$/;

// 하이픈·공백을 넣거나 붙여 넣어도 숫자만 남깁니다.
export function toPhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, PHONE_MAX_LENGTH);
}

export type GuardianField = "relation" | "phoneNumber" | "consentAgreed";

const fieldNames: Record<GuardianField, string> = {
  relation: "관계",
  phoneNumber: "전화번호",
  consentAgreed: "동의",
};

export function missingGuardianFields(form: GuardianForm): GuardianField[] {
  const missing: GuardianField[] = [];
  if (!form.relation) {
    missing.push("relation");
  }
  if (!phonePattern.test(form.phoneNumber)) {
    missing.push("phoneNumber");
  }
  if (!form.consentAgreed) {
    missing.push("consentAgreed");
  }
  return missing;
}

// 저장 버튼 아래 안내입니다. 예: "전화번호, 동의를 확인해 주세요"
export function missingGuardianMessage(fields: GuardianField[]): string | null {
  if (fields.length === 0) {
    return null;
  }
  return `${fields.map((field) => fieldNames[field]).join(", ")}를 확인해 주세요`;
}

// 다 채웠으면 저장 입력을 만들고, 빠진 항목이 있으면 null입니다.
// 요청 본문(policyVersion 포함)은 api/guardians.ts의 buildGuardianRequest가 만듭니다.
export function createGuardianInput(form: GuardianForm): GuardianInput | null {
  if (missingGuardianFields(form).length > 0 || !form.relation) {
    return null;
  }
  return {
    relation: form.relation,
    phoneNumber: form.phoneNumber,
    consentAgreed: true,
  };
}

export type GuardianSaveResult =
  | { kind: "saved" }
  // GUARDIAN_400: 칸마다 안내를 붙이고, 칸이 없는 오류(policyVersion)는 message로 보여 줍니다.
  | {
      kind: "invalid";
      fieldErrors: Partial<Record<GuardianField, string>>;
      message: string | null;
    }
  // AUTH_401: refresh 후에도 401이면 로그인(L01)으로 보냅니다.
  | { kind: "needsLogin" }
  | { kind: "error"; message: string };

const fieldErrorMessages: Record<GuardianField, string> = {
  relation: "누구인지 다시 골라 주세요",
  phoneNumber: "전화번호를 숫자 10~11자리로 눌러 주세요",
  consentAgreed: "보호자 연락처 저장에 동의해 주세요",
};

const policyVersionMessage =
  "동의 내용이 바뀌었어요. 내용 보기에서 다시 확인하고 저장해 주세요.";

function isGuardianField(field: string): field is GuardianField {
  return field in fieldErrorMessages;
}

// 저장 결과(memberSession)를 화면에서 보여 줄 안내로 바꿉니다.
export function toGuardianSaveResult(
  outcome: GuardianOutcome,
): GuardianSaveResult {
  if (outcome.kind === "invalid") {
    const fieldErrors: Partial<Record<GuardianField, string>> = {};
    let message: string | null = null;
    for (const { field } of outcome.fieldErrors) {
      if (isGuardianField(field)) {
        fieldErrors[field] = fieldErrorMessages[field];
      } else if (field === "policyVersion") {
        message = policyVersionMessage;
      }
    }
    // 알 수 없는 칸이거나 errors가 비어 있으면 서버 안내 문장을 보여 줍니다.
    if (Object.keys(fieldErrors).length === 0 && !message) {
      message = outcome.message;
    }
    return { kind: "invalid", fieldErrors, message };
  }
  if (outcome.kind === "failed") {
    return { kind: "error", message: outcome.message };
  }
  if (outcome.kind === "needsLogin") {
    return { kind: "needsLogin" };
  }
  return { kind: "saved" };
}
