import type { MapLocation } from "@/components/map/types";

// 카카오맵 길 찾기 링크입니다. 병원 안내(S05) 병원 카드의 길 찾기와 같은 형식입니다.
export function getDirectionsUrl(
  place: MapLocation & { name: string },
): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
}
