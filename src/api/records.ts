import { apiRequest, isMockApi } from "@/api/client";
import { ApiError, INVALID_RESPONSE } from "@/api/errors";
import * as mock from "@/api/mockApi";
import type { SummaryContent } from "@/api/summaries";
import type { IsoDateTime, PageMeta, PageParams } from "@/api/types";

// 내 기록 목록의 기본 페이지 크기입니다. 서버 기본값과 같고 최대는 50입니다.
export const RECORDS_PAGE_SIZE = 20;

export interface SaveRecordResult {
  medicalRecordId: number;
  savedAt: IsoDateTime;
}

export interface RecordListItem {
  medicalRecordId: number;
  // 기록을 보관한 시각입니다.
  createdAt: IsoDateTime;
  departmentName: string;
  mainSymptom: string;
  // H01의 두 번째 줄입니다. 서버가 onsetDetail과 첫 번째 증상별 항목으로 만들어 줍니다. 화면에서 다시 조합하지 않습니다.
  subtitle: string;
}

export interface RecordListResult extends PageMeta {
  // 최근 순입니다. 없으면 []입니다.
  records: RecordListItem[];
}

// 요약지 조회(GET /summaries/{summaryId})의 summary와 같은 모양이라 S06 요약지 컴포넌트를 그대로 씁니다.
// 보관할 때 null(확인 못 함)과 [](없음)이 그대로 유지됩니다.
export interface RecordDetail {
  medicalRecordId: number;
  createdAt: IsoDateTime;
  summary: SummaryContent;
}

export interface DeleteRecordResult {
  medicalRecordId: number;
}

function recordPath(medicalRecordId: number): string {
  return `/members/me/summaries/${encodeURIComponent(String(medicalRecordId))}`;
}

// 요약지를 내 기록에 보관합니다(S06). 로그인과 기록 저장 동의가 필요합니다.
// 실패 code: AUTH_401(로그인), CONSENT_403(기록 저장 동의 없음, C02),
// SUMMARY_403·404(이 요약지가 아니거나 없어짐, S01),
// SUMMARY_409(result가 null이면 아직 생성 중, medicalRecordId가 있으면 이미 보관).
// 보관하면 Redis의 문진·요약지는 지워지므로 같은 summaryId로 다시 조회할 수 없습니다.
export async function saveSummaryToRecords(
  summaryId: string,
  signal?: AbortSignal,
): Promise<SaveRecordResult> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.saveSummaryToRecords(summaryId);
  }
  return apiRequest<SaveRecordResult>(
    `/summaries/${encodeURIComponent(summaryId)}/save`,
    { method: "POST", signal },
  );
}

// 내 기록 목록(H01)입니다. page는 0부터 셉니다.
export async function listRecords(
  params: PageParams = {},
  signal?: AbortSignal,
): Promise<RecordListResult> {
  const { page = 0, size = RECORDS_PAGE_SIZE } = params;
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.listRecords({ page, size });
  }
  const result = await apiRequest<RecordListResult>("/members/me/summaries", {
    query: { page, size },
    signal,
  });
  if (!Array.isArray(result?.records)) {
    throw new ApiError(INVALID_RESPONSE, "", 200);
  }
  return result;
}

// 기록 상세(H02)입니다. 다른 회원의 기록은 SUMMARY_403, 없거나 지운 기록은 SUMMARY_404입니다.
export async function getRecord(
  medicalRecordId: number,
  signal?: AbortSignal,
): Promise<RecordDetail> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.getRecord(medicalRecordId);
  }
  const result = await apiRequest<RecordDetail>(recordPath(medicalRecordId), {
    signal,
  });
  if (!result?.summary) throw new ApiError(INVALID_RESPONSE, "", 200);
  return result;
}

// 기록을 지웁니다(H01, H02). 이미 지운 기록은 SUMMARY_404입니다.
export async function deleteRecord(
  medicalRecordId: number,
  signal?: AbortSignal,
): Promise<DeleteRecordResult> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.deleteRecord(medicalRecordId);
  }
  return apiRequest<DeleteRecordResult>(recordPath(medicalRecordId), {
    method: "DELETE",
    signal,
  });
}
