import { getErrorMessage, isApiError } from "@/api/errors";
import { getRegions, type Region } from "@/api/regions";

// 사용자가 아직 고르지 않았을 때 골라 둘 시·군입니다(Figma S05b, 이슈 #33).
export const DEFAULT_REGION_NAME = "홍천군";

// 지금 선택된 시·군입니다. 고른 코드가 목록에 있으면 그것이고, 없으면 기본 시·군입니다.
// 목록이 나중에 도착해도 기본 선택이 맞도록 상태에 넣지 않고 매번 목록에서 구합니다.
export function selectedRegion(
  regions: readonly Region[],
  chosenCode: string | null,
): Region | null {
  return (
    regions.find((region) => region.regionCode === chosenCode) ??
    regions.find((region) => region.regionName === DEFAULT_REGION_NAME) ??
    null
  );
}

export type RegionLoad =
  | { kind: "loaded"; regions: Region[] }
  // 목록을 받지 못했습니다. 화면은 안내와 다시 시도를 보여 줍니다.
  | { kind: "failed"; message: string };

// 시·군 목록을 받습니다(GET /regions, 처음 한 번 받아 캐시). 코드 실수(ApiError가 아닌 오류)는 그대로 던집니다.
export async function loadRegions(): Promise<RegionLoad> {
  try {
    const { regions } = await getRegions();
    return { kind: "loaded", regions };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return { kind: "failed", message: getErrorMessage(error) };
  }
}
