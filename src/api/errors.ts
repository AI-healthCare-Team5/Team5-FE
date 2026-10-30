import { intakeStatuses, isEnumValue, type IntakeStatus } from "@/api/enums";
import type { FieldError } from "@/api/types";

// 서버 응답을 받지 못했거나 응답 형식이 맞지 않을 때 쓰는 프론트 전용 code입니다.
export const NETWORK_ERROR = "NETWORK_ERROR";
export const INVALID_RESPONSE = "INVALID_RESPONSE";

export const SERVER_ERROR_MESSAGE =
  "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.";
export const LLM_ERROR_MESSAGE = "잠시 후 다시 시도해 주세요.";

// 실패 응답을 담아 던지는 오류입니다. 화면은 code로 분기합니다.
export class ApiError extends Error {
  readonly code: string;
  // HTTP 상태 코드. 응답을 받지 못했으면 0입니다.
  readonly status: number;
  readonly result: unknown;

  constructor(
    code: string,
    message: string,
    status: number,
    result: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.result = result;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// code의 HTTP 상태 부분입니다. 예: INTAKE_409 → 409
function codeStatus(code: string): number | null {
  const match = /_(\d{3})$/.exec(code);
  return match ? Number(match[1]) : null;
}

// {도메인}_500, 응답을 받지 못한 경우, 형식이 맞지 않는 5xx 응답입니다.
export function isServerError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.code === NETWORK_ERROR) return true;
  if (error.code === INVALID_RESPONSE) return error.status >= 500;
  return codeStatus(error.code) === 500;
}

// {도메인}_503: LLM 호출이 재시도 후에도 실패했습니다.
export function isLlmUnavailable(error: unknown): boolean {
  return isApiError(error) && codeStatus(error.code) === 503;
}

// 400 응답의 result.errors입니다. 없으면 빈 배열입니다.
export function getFieldErrors(error: unknown): FieldError[] {
  if (!isApiError(error) || codeStatus(error.code) !== 400) return [];
  const errors = (error.result as { errors?: unknown } | null)?.errors;
  if (!Array.isArray(errors)) return [];
  return errors.filter(
    (item): item is FieldError =>
      typeof item?.field === "string" && typeof item?.reason === "string",
  );
}

// INTAKE_409에서 이미 끝난 문진의 상태입니다. 중복 전송이면 null입니다.
export function getIntakeConflictStatus(error: unknown): IntakeStatus | null {
  if (!isApiError(error) || error.code !== "INTAKE_409") return null;
  const status = (error.result as { status?: unknown } | null)?.status;
  return isEnumValue(intakeStatuses, status) ? status : null;
}

// SUMMARY_409에서 이미 보관한 기록의 ID입니다. 아직 생성 중이면 null입니다.
export function getSavedMedicalRecordId(error: unknown): number | null {
  if (!isApiError(error) || error.code !== "SUMMARY_409") return null;
  const id = (error.result as { medicalRecordId?: unknown } | null)
    ?.medicalRecordId;
  return typeof id === "number" ? id : null;
}

// 화면에 보여 줄 오류 문장입니다. 서버 오류와 LLM 실패는 공통 안내를 씁니다.
export function getErrorMessage(error: unknown): string {
  if (isLlmUnavailable(error)) return LLM_ERROR_MESSAGE;
  if (isServerError(error) || !isApiError(error) || !error.message) {
    return SERVER_ERROR_MESSAGE;
  }
  return error.message;
}
