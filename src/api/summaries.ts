import { apiRequest, isMockApi } from "@/api/client";
import type {
  AgeGroup,
  BodyPart,
  Gender,
  InputMode,
  Onset,
  RedFlagCategory,
  Relation,
  SummaryStatus,
  SummaryStep,
  SummaryStepStatus,
} from "@/api/enums";
import { ApiError, INVALID_RESPONSE, isApiError } from "@/api/errors";
import type { DepartmentRecommendation } from "@/api/intakes";
import * as mock from "@/api/mockApi";
import type { CollectedList, IsoDateTime } from "@/api/types";

// 복용약·앓는 병·알레르기의 한 항목입니다.
export interface HealthInfoItem {
  name: string;
  detail: string | null;
}

// 증상별 항목입니다. 수정할 때 order로 항목을 고릅니다.
export interface SummaryItem {
  order: number;
  label: string;
  question: string;
  // null은 "확인 못 했어요"입니다.
  value: string | null;
}

export interface SummaryStepState {
  step: SummaryStep;
  status: SummaryStepStatus;
}

export interface SummaryContent {
  ageGroup: AgeGroup;
  gender: Gender;
  inputMode: InputMode;
  mainSymptom: string;
  // null은 "확인 못 했어요"입니다.
  bodyPart: BodyPart | null;
  onset: Onset | null;
  onsetDetail: string | null;
  extraNote: string | null;
  // 건강 정보: null은 "확인 못 했어요", []는 "없음"입니다.
  medications: CollectedList<HealthInfoItem>;
  conditions: CollectedList<HealthInfoItem>;
  allergies: CollectedList<HealthInfoItem>;
  items: SummaryItem[];
  department: DepartmentRecommendation;
  // "내용이 맞아요"를 눌렀는지입니다.
  isConfirmed: boolean;
}

export interface SummaryResponse {
  summaryId: string;
  intakeId: string;
  status: SummaryStatus;
  // BASIC_INFO, SYMPTOM, HEALTH_INFO, DEPARTMENT 순서의 4단계입니다.
  steps: SummaryStepState[];
  // DONE일 때만 있고 그 외에는 null입니다.
  summary: SummaryContent | null;
  createdAt: IsoDateTime;
}

export interface SummaryItemUpdate {
  order: number;
  // null은 "확인 못 했어요"입니다.
  value: string | null;
}

// 보낸 필드만 바꾸고 안 보낸(undefined) 필드는 그대로 둡니다.
// null은 "확인 못 했어요"(또는 지움)이고, 건강 정보의 []는 "없음"입니다.
// 건강 정보를 보내면 통째로 바뀝니다. 수정하면 isConfirmed는 false로 돌아갑니다.
export interface SummaryUpdateRequest {
  // 나이대·성별·주된 증상은 null로 바꿀 수 없습니다.
  ageGroup?: AgeGroup;
  gender?: Gender;
  // 최대 100자입니다.
  mainSymptom?: string;
  bodyPart?: BodyPart | null;
  // onset만 보내면 onsetDetail은 onset 문구로 바뀝니다.
  onset?: Onset | null;
  // 최대 50자입니다.
  onsetDetail?: string | null;
  extraNote?: string | null;
  medications?: CollectedList<HealthInfoItem>;
  conditions?: CollectedList<HealthInfoItem>;
  allergies?: CollectedList<HealthInfoItem>;
  // 보낸 order의 값만 바뀝니다.
  items?: SummaryItemUpdate[];
}

export interface SummaryConfirmResult {
  summaryId: string;
  // 항상 true입니다.
  isConfirmed: boolean;
}

export interface SummaryRetryResult {
  intakeId: string;
  // 다시 만들어도 그대로입니다.
  summaryId: string;
  // 항상 GENERATING입니다.
  status: SummaryStatus;
}

// status가 DONE이고 요약지 내용이 반드시 있는 응답입니다.
export type DoneSummaryResponse = SummaryResponse & {
  status: "DONE";
  summary: SummaryContent;
};

// 로그인하고 보호자를 등록한 경우에만 옵니다. 응급 카드는 전화번호를 가리지 않고 줍니다.
export interface EmergencyCardGuardian {
  relation: Relation;
  phoneNumber: string;
}

export interface EmergencyCardResponse {
  intakeId: string;
  createdAt: IsoDateTime;
  userUtterance: string;
  redFlagCategory: RedFlagCategory;
  // 기본 정보를 묻기 전에도 응급으로 전환되므로 아래 항목은 못 물었으면 null("확인 못 했어요")입니다.
  mainSymptom: string | null;
  onsetDetail: string | null;
  ageGroup: AgeGroup | null;
  gender: Gender | null;
  // 건강 정보: null은 "확인 못 했어요", []는 "없음"입니다.
  medications: CollectedList<HealthInfoItem>;
  conditions: CollectedList<HealthInfoItem>;
  allergies: CollectedList<HealthInfoItem>;
  guardian: EmergencyCardGuardian | null;
}

// 폴링 결과입니다. 호출한 쪽이 kind로 화면을 고릅니다.
export type SummaryPollResult =
  // 요약지가 만들어졌습니다. summary.summary에 내용이 있습니다.
  | { kind: "done"; summary: DoneSummaryResponse }
  // "다시 만들기" 안내가 필요합니다.
  // failed: 서버가 FAILED로 응답했습니다. timeout: 폴링을 시작하고 30초 안에 끝나지 않았습니다.
  // last는 마지막으로 받은 응답입니다. 첫 응답 전에 시간이 끝나면 없습니다.
  | {
      kind: "needsRetry";
      reason: "failed" | "timeout";
      last?: SummaryResponse;
    };

export interface PollSummaryOptions {
  // 호출한 쪽이 abort하면 폴링을 멈추고 signal.reason(기본 AbortError)으로 reject합니다.
  // 시간 제한(timeout)은 reject가 아니라 needsRetry로 돌려줘서 이와 구분됩니다.
  signal?: AbortSignal;
  // 응답을 받을 때마다 부릅니다. 응답의 steps로 진행 중인 단계를 보여 줍니다.
  onProgress?: (response: SummaryResponse) => void;
}

// 응답을 받은 뒤 이만큼 기다렸다 다음 요청을 보냅니다.
export const SUMMARY_POLL_INTERVAL_MS = 1000;
// 폴링을 시작하고 이 시간 안에 끝나지 않으면 진행 중인 요청을 취소하고 다시 만들기를 안내합니다.
export const SUMMARY_POLL_TIMEOUT_MS = 30_000;

// SUMMARY_409입니다. 수정·확인은 요약지가 아직 만드는 중이거나 실패했을 때,
// 다시 만들기는 이미 만드는 중이거나 만들어졌을 때 받습니다.
export function isSummaryConflict(error: unknown): boolean {
  return isApiError(error) && error.code === "SUMMARY_409";
}

function summaryPath(summaryId: string, suffix = ""): string {
  return `/summaries/${encodeURIComponent(summaryId)}${suffix}`;
}

// 요약지 생성 상태와 내용을 조회합니다.
export async function getSummary(
  summaryId: string,
  signal?: AbortSignal,
): Promise<SummaryResponse> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.getSummary(summaryId);
  }
  return apiRequest<SummaryResponse>(summaryPath(summaryId), { signal });
}

// "고칠 곳이 있어요". 아직 생성 중이거나 실패한 요약지는 SUMMARY_409입니다.
export async function updateSummary(
  summaryId: string,
  request: SummaryUpdateRequest,
  signal?: AbortSignal,
): Promise<SummaryResponse> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.updateSummary(summaryId, request);
  }
  return apiRequest<SummaryResponse>(summaryPath(summaryId), {
    method: "PATCH",
    body: request,
    signal,
  });
}

// "내용이 맞아요". 아직 생성 중이거나 실패한 요약지는 SUMMARY_409입니다.
export async function confirmSummary(
  summaryId: string,
  signal?: AbortSignal,
): Promise<SummaryConfirmResult> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.confirmSummary(summaryId);
  }
  return apiRequest<SummaryConfirmResult>(summaryPath(summaryId, "/confirm"), {
    method: "POST",
    signal,
  });
}

// 생성에 실패(FAILED)한 요약지를 다시 만듭니다. summaryId는 그대로라 같은 ID로 폴링하면 됩니다.
export async function retrySummary(
  intakeId: string,
  signal?: AbortSignal,
): Promise<SummaryRetryResult> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.retrySummary(intakeId);
  }
  return apiRequest<SummaryRetryResult>(
    `/intakes/${encodeURIComponent(intakeId)}/summary`,
    { method: "POST", signal },
  );
}

// 응급 카드를 조회합니다. 응급으로 전환되지 않은 문진은 SUMMARY_409입니다.
export async function getEmergencyCard(
  intakeId: string,
  signal?: AbortSignal,
): Promise<EmergencyCardResponse> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.getEmergencyCard(intakeId);
  }
  return apiRequest<EmergencyCardResponse>(
    `/intakes/${encodeURIComponent(intakeId)}/emergency-card`,
    { signal },
  );
}

// signal이 abort되면 기다리던 타이머를 지우고 signal.reason으로 reject합니다.
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// signal이 abort되면 promise가 끝나기를 기다리지 않고 signal.reason으로 reject합니다.
// 취소에 반응하지 않는 요청(예: 토큰 재발급 중)이 있어도 시간 제한 안에 끝나게 합니다.
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      // 늦게 끝나는 원래 요청의 오류가 처리되지 않은 reject로 남지 않게 합니다.
      promise.catch(() => undefined);
      reject(signal.reason);
      return;
    }
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

// 요약지가 DONE이 될 때까지 조회합니다.
// 응답을 받은 뒤 1초를 기다려 다음 요청을 보내므로 요청이 겹치지 않습니다.
// 시작하고 30초가 되면 진행 중인 요청을 취소하고 needsRetry(timeout)로 돌려줍니다.
// 서버가 응답하지 않아도 30초에 끝나고, 시간이 끝난 뒤에 도착한 응답은 쓰지 않습니다.
// DONE인데 요약지 내용이 없으면 INVALID_RESPONSE를 던집니다.
// 조회가 실패하면(ApiError 등) 폴링을 멈추고 그 오류를 던집니다.
export async function pollSummary(
  summaryId: string,
  options: PollSummaryOptions = {},
): Promise<SummaryPollResult> {
  const { signal, onProgress } = options;
  signal?.throwIfAborted();

  // 진행 중인 요청과 대기를 함께 멈추는 데 씁니다.
  // 호출한 쪽의 abort와 시간 제한이 모두 여기로 모입니다.
  const poll = new AbortController();
  let timedOut = false;
  let last: SummaryResponse | undefined;
  const onCallerAbort = () => poll.abort(signal?.reason);
  signal?.addEventListener("abort", onCallerAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    poll.abort();
  }, SUMMARY_POLL_TIMEOUT_MS);

  try {
    for (;;) {
      const response = await abortable(
        getSummary(summaryId, poll.signal),
        poll.signal,
      );
      poll.signal.throwIfAborted();
      last = response;
      onProgress?.(response);
      // 콜백 안에서 호출한 쪽이 abort했다면 결과를 돌려주지 않고 reject합니다.
      poll.signal.throwIfAborted();
      if (response.status === "DONE") {
        if (!response.summary) throw new ApiError(INVALID_RESPONSE, "", 200);
        return { kind: "done", summary: response as DoneSummaryResponse };
      }
      if (response.status === "FAILED") {
        return { kind: "needsRetry", reason: "failed", last: response };
      }
      await sleep(SUMMARY_POLL_INTERVAL_MS, poll.signal);
    }
  } catch (error) {
    // 호출한 쪽이 abort한 경우는 시간 제한보다 우선해 reject로 구분합니다.
    if (timedOut && !signal?.aborted) {
      return { kind: "needsRetry", reason: "timeout", last };
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}
