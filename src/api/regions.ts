import { apiRequest, isMockApi } from "@/api/client";
import * as mock from "@/api/mockApi";

export interface Region {
  // 병원 검색의 regionCode로 씁니다.
  regionCode: string;
  regionName: string;
  centerLatitude: number;
  centerLongitude: number;
}

export interface RegionListResult {
  // 강원 18개 시·군이고 이름순(가나다)입니다.
  regions: Region[];
}

// 성공한 결과만 한 번 저장합니다. 실패하면 저장하지 않아 다음 호출에서 다시 요청합니다.
// 저장한 객체는 밖으로 내보내지 않고, 호출마다 복사본을 돌려줍니다.
let cached: RegionListResult | null = null;
// 요청이 진행 중일 때 들어온 호출은 같은 요청을 함께 기다립니다.
let pending: Promise<RegionListResult> | null = null;

async function fetchRegions(): Promise<RegionListResult> {
  if (isMockApi) return mock.getRegions();
  return apiRequest<RegionListResult>("/regions");
}

function loadRegions(): Promise<RegionListResult> {
  if (cached) return Promise.resolve(cached);
  pending ??= fetchRegions()
    .then((result) => {
      cached = result;
      return result;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

// 시·군 목록을 돌려줍니다. 여러 호출이 요청 하나를 나눠 쓰므로 AbortSignal은 받지 않습니다.
// 호출한 쪽이 결과를 바꿔도 저장한 목록과 다른 호출의 결과에는 영향이 없습니다.
export async function getRegions(): Promise<RegionListResult> {
  return structuredClone(await loadRegions());
}
