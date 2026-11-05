import { apiRequest, isMockApi } from "@/api/client";
import type {
  AnswerType,
  BodyPart,
  InputMode,
  IntakeStage,
  IntakeStatus,
  Onset,
  RedFlagCategory,
} from "@/api/enums";
import { getIntakeConflictStatus, isApiError } from "@/api/errors";
import * as mock from "@/api/mockApi";

export interface IntakeStartRequest {
  inputMode: InputMode;
  // VOICE·TEXT일 때 필수입니다. BUTTON일 때는 "더 알려주실 내용"입니다.
  text?: string | null;
  // BUTTON일 때 필수입니다.
  bodyPart?: BodyPart | null;
  // BUTTON일 때 필수입니다.
  onset?: Onset | null;
}

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

// status가 EMERGENCY일 때만 채워집니다. E01 "말씀하신 내용"에 userUtterance를 보여 줍니다(src/stores/emergency.ts).
export interface IntakeEmergency {
  userUtterance: string;
  redFlagCategory: RedFlagCategory;
}

export interface DepartmentRecommendation {
  // 심평원 진료과목코드입니다. 병원 검색의 departmentCode로 씁니다.
  departmentCode: string;
  departmentName: string;
  recommendReason: string;
}

export interface IntakeResponse {
  intakeId: string;
  status: IntakeStatus;
  stage: IntakeStage;
  progress: IntakeProgress;
  // 지금까지 모은 정보입니다. 화면 상단에 보여 줍니다.
  collected: string[];
  // EMERGENCY·COMPLETED면 null입니다.
  question: IntakeQuestion | null;
  // 못 알아들어 같은 질문을 다시 묻는 중이면 true입니다.
  reask: boolean;
  // EMERGENCY일 때만 있습니다.
  emergency: IntakeEmergency | null;
  // COMPLETED일 때만 있습니다.
  department: DepartmentRecommendation | null;
  // COMPLETED일 때만 있고, 서버가 요약지 생성을 바로 시작합니다.
  summaryId: string | null;
}

export interface IntakeAnswerRequest {
  // 현재 질문과 다르면 INTAKE_409입니다(버튼 두 번 누름 방지).
  questionId: string;
  // 답변마다 달라도 됩니다.
  inputMode: InputMode;
  // 말·글은 그대로, 버튼은 YES / NO / UNKNOWN 또는 선택지 code입니다.
  answer: string;
}

export interface IntakeCancelResult {
  intakeId: string;
  // 항상 CANCELED입니다.
  status: IntakeStatus;
}

export interface IntakeDepartmentResult extends DepartmentRecommendation {
  intakeId: string;
}

// 답변·이전 질문 호출의 결과입니다. 호출한 쪽이 kind로 다음 화면을 고릅니다.
export type IntakeStepResult =
  // 정상 응답입니다. intake의 status가 IN_PROGRESS·EMERGENCY·COMPLETED 중 하나입니다.
  | { kind: "advanced"; intake: IntakeResponse }
  // INTAKE_409(result 없음): 현재 질문이 아니라서(중복 전송) 문진을 다시 조회한 결과입니다.
  | { kind: "resynced"; intake: IntakeResponse }
  // INTAKE_409(result.status 있음): 이미 끝난 문진입니다. 그 상태에 맞는 화면으로 보냅니다.
  | { kind: "ended"; status: IntakeStatus };

function intakePath(intakeId: string, suffix = ""): string {
  return `/intakes/${encodeURIComponent(intakeId)}${suffix}`;
}

// 문진을 시작합니다. 첫 입력이 위험 신호면 status가 EMERGENCY입니다.
export async function startIntake(
  request: IntakeStartRequest,
  signal?: AbortSignal,
): Promise<IntakeResponse> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.startIntake(request);
  }
  return apiRequest<IntakeResponse>("/intakes", {
    method: "POST",
    body: request,
    signal,
  });
}

// 문진의 현재 상태를 조회합니다.
export async function getIntake(
  intakeId: string,
  signal?: AbortSignal,
): Promise<IntakeResponse> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.getIntake(intakeId);
  }
  return apiRequest<IntakeResponse>(intakePath(intakeId), { signal });
}

// INTAKE_409를 호출한 쪽이 다룰 수 있는 결과로 바꿉니다.
// result.status가 있으면 그 상태를 돌려주고, 없으면 GET으로 한 번만 다시 조회합니다.
// 다시 조회한 요청이 실패하면 그 오류를 그대로 던지고, 더 시도하지 않습니다.
async function runStep(
  intakeId: string,
  request: () => Promise<IntakeResponse>,
  signal?: AbortSignal,
): Promise<IntakeStepResult> {
  try {
    return { kind: "advanced", intake: await request() };
  } catch (error) {
    if (!isApiError(error) || error.code !== "INTAKE_409") throw error;
    const status = getIntakeConflictStatus(error);
    if (status !== null) return { kind: "ended", status };
    return { kind: "resynced", intake: await getIntake(intakeId, signal) };
  }
}

// 현재 질문에 답합니다. 다음 질문, 응급 전환, 완료 중 하나로 응답합니다.
export function answerIntake(
  intakeId: string,
  request: IntakeAnswerRequest,
  signal?: AbortSignal,
): Promise<IntakeStepResult> {
  return runStep(
    intakeId,
    async () => {
      if (isMockApi) {
        signal?.throwIfAborted();
        return mock.answerIntake(intakeId, request);
      }
      return apiRequest<IntakeResponse>(intakePath(intakeId, "/answers"), {
        method: "POST",
        body: request,
        signal,
      });
    },
    signal,
  );
}

// 직전 답변을 지우고 그 질문을 다시 묻습니다. 첫 질문이면 INTAKE_400을 던집니다(이전 버튼을 숨깁니다).
export function goBackIntake(
  intakeId: string,
  signal?: AbortSignal,
): Promise<IntakeStepResult> {
  return runStep(
    intakeId,
    async () => {
      if (isMockApi) {
        signal?.throwIfAborted();
        return mock.goBackIntake(intakeId);
      }
      return apiRequest<IntakeResponse>(intakePath(intakeId, "/back"), {
        method: "POST",
        signal,
      });
    },
    signal,
  );
}

// 문진과 요약지를 지우고, 요약지를 만드는 중이면 멈춥니다. 처음 화면(S01)으로 돌아갈 때 씁니다.
export async function cancelIntake(
  intakeId: string,
  signal?: AbortSignal,
): Promise<IntakeCancelResult> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.cancelIntake(intakeId);
  }
  return apiRequest<IntakeCancelResult>(intakePath(intakeId, "/cancel"), {
    method: "POST",
    signal,
  });
}

// COMPLETED 때 계산해 둔 추천 진료과를 조회합니다. 아직 끝나지 않았으면 DEPARTMENT_409입니다.
export async function getIntakeDepartment(
  intakeId: string,
  signal?: AbortSignal,
): Promise<IntakeDepartmentResult> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.getIntakeDepartment(intakeId);
  }
  return apiRequest<IntakeDepartmentResult>(
    intakePath(intakeId, "/department"),
    {
      signal,
    },
  );
}
