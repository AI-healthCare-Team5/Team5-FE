import type { IntakeStatus } from "@/api/enums";

// 모든 API의 성공·실패 응답이 같은 네 필드를 가집니다.
export interface ApiResponse<T> {
  isSuccess: boolean;
  // {도메인}_{HTTP 상태}. 예: INTAKE_200, SUMMARY_409. 401은 어느 API든 AUTH_401입니다.
  code: string;
  // 화면에 그대로 보여도 되는 한국어 문장입니다.
  message: string;
  result: T;
}

// 400 응답의 result입니다.
export interface FieldError {
  field: string;
  reason: string;
}

export interface ValidationErrorResult {
  errors: FieldError[];
}

// INTAKE_409에서 result가 있으면 이미 끝난 문진입니다. null이면 중복 전송입니다.
export interface IntakeConflictResult {
  status: IntakeStatus;
}

// SUMMARY_409(보관)에서 result가 있으면 이미 보관한 기록입니다. null이면 아직 생성 중입니다.
export interface SummaryConflictResult {
  medicalRecordId: number;
}

// ISO 8601 + 시간대. 예: 2026-10-30T14:20:00+09:00
export type IsoDateTime = string;

// 시각만 쓸 때의 HH:mm. 예: 09:00
export type TimeOfDay = string;

// 목록 요청의 페이징 값입니다. page는 0부터 셉니다.
export interface PageParams {
  page?: number;
  size?: number;
}

// 목록 응답의 페이징 값입니다. 목록 필드 이름은 API마다 정합니다.
export interface PageMeta {
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
}

// 못 물은 항목은 null("확인 못 했어요"), 물었는데 없다고 하면 [] ("없음")입니다.
export type CollectedList<T> = T[] | null;
