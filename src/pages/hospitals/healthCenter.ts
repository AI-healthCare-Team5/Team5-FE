import { isApiError } from "@/api/errors";
import { getNearestHealthCenter, type Hospital } from "@/api/hospitals";
import type { HospitalQuery } from "@/pages/hospitals/hospitalSearch";
import { resolveSearchLocation } from "@/pages/hospitals/searchLocation";

// S05c에서 병원을 찾지 못했을 때 곁들이는 "가까운 보건소"입니다. 없어도 되는 안내라서,
// 위치를 못 얻었거나 서버가 실패했거나 보건소가 없으면 조용히 null을 돌려주고 카드를 그리지 않습니다.
// API 오류가 아닌 예외(코드 실수)는 숨기지 않고 던집니다.
export async function loadNearestHealthCenter(
  query: HospitalQuery,
  signal?: AbortSignal,
): Promise<Hospital | null> {
  try {
    const location = await resolveSearchLocation(query);
    if (!location || signal?.aborted) return null;
    const result = await getNearestHealthCenter(location.params, signal);
    return signal?.aborted ? null : result.hospital;
  } catch (error) {
    if (signal?.aborted || isApiError(error)) return null;
    throw error;
  }
}
