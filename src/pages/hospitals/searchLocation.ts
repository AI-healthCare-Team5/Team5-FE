import { isMockApi } from "@/api/client";
import type { HospitalLocationParams } from "@/api/hospitals";
import { getMockUserLocation } from "@/api/mockApi";
import { requestCurrentPosition } from "@/components/map/currentPosition";
import type { MapLocation } from "@/components/map/types";
import type { HospitalQuery } from "@/pages/hospitals/hospitalSearch";

export interface SearchLocation {
  // 병원·보건소 검색 API에 넘기는 위치 조건입니다. 위치(latitude·longitude)와 지역(regionCode) 중 하나입니다.
  params: HospitalLocationParams;
  // 지도에 내 위치로 표시할 좌표입니다. 지역으로 찾을 때는 없습니다.
  point: MapLocation | null;
}

// 병원을 찾을 기준을 정합니다. 주소에 지역 코드가 있으면 그 지역(S05b)이고, 없으면 브라우저의 현재 위치입니다.
// 위치는 서버에 저장하지 않고 이 검색에만 쓰며, 앱에도 따로 기억해 두지 않습니다(같은 검색이면 브라우저가 최근 위치를 다시 씁니다).
// 가짜 응답(VITE_API_MOCK)에서는 권한을 묻지 않고 가짜 위치를 씁니다.
// 위치 권한을 거부했거나 측정에 실패하면 null입니다.
export async function resolveSearchLocation(
  query: HospitalQuery,
): Promise<SearchLocation | null> {
  if (query.regionCode) {
    return { params: { regionCode: query.regionCode }, point: null };
  }
  const point = isMockApi
    ? getMockUserLocation()
    : await requestCurrentPosition();
  if (!point) return null;
  return {
    params: { latitude: point.latitude, longitude: point.longitude },
    point: { latitude: point.latitude, longitude: point.longitude },
  };
}
