import type { Relation } from "@/api/enums";
import { getErrorMessage, getFieldErrors, isApiError } from "@/api/errors";

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

// PUT /api/members/me/guardian 요청 본문입니다. 등록과 동의를 한 요청으로 보냅니다.
// policyVersion(현재 동의서 버전)을 어디서 받는지는 API 연결(#29)에서 정하고 그때 붙입니다.
export interface GuardianRequest {
  relation: Relation;
  phoneNumber: string;
  consentAgreed: true;
  policyVersion: string;
}

export type GuardianInput = Omit<GuardianRequest, "policyVersion">;

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

// 다 채웠으면 요청 본문을 만들고, 빠진 항목이 있으면 null입니다.
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
  // API 연결(#29) 전 실제 경로입니다.
  | { kind: "unavailable" }
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

// 저장 요청이 실패했을 때 화면에서 할 일을 정합니다.
export function guardianSaveError(error: unknown): GuardianSaveResult {
  if (isApiError(error) && error.code === "AUTH_401") {
    return { kind: "needsLogin" };
  }
  if (isApiError(error) && error.code === "GUARDIAN_400") {
    const fieldErrors: Partial<Record<GuardianField, string>> = {};
    let message: string | null = null;
    for (const { field } of getFieldErrors(error)) {
      if (isGuardianField(field)) {
        fieldErrors[field] = fieldErrorMessages[field];
      } else if (field === "policyVersion") {
        message = policyVersionMessage;
      }
    }
    if (Object.keys(fieldErrors).length === 0 && !message) {
      message = getErrorMessage(error);
    }
    return { kind: "invalid", fieldErrors, message };
  }
  return { kind: "error", message: getErrorMessage(error) };
}

// "저장하기"를 눌렀을 때 할 일입니다. 빠진 항목이 있으면 null입니다.
// 보호자는 로그인한 회원에게만 저장하고, 저장 API 연결(#29) 전에는 가짜 응답에서만 저장된 것으로 봅니다.
export function decideGuardianSave(
  form: GuardianForm,
  { loggedIn, mockApi }: { loggedIn: boolean; mockApi: boolean },
): GuardianSaveResult | null {
  if (!createGuardianInput(form)) {
    return null;
  }
  if (!loggedIn) {
    return { kind: "needsLogin" };
  }
  return mockApi ? { kind: "saved" } : { kind: "unavailable" };
}
