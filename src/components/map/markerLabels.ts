import type { MapHospital } from "@/components/map/types";

// 스크린 리더가 목록과 같은 병원 이름을 읽도록 마커 이름을 현재 데이터로 맞춥니다.
export function syncMarkerLabels(
  markers: ReadonlyMap<string, { button: Pick<HTMLElement, "setAttribute"> }>,
  hospitals: readonly Pick<MapHospital, "id" | "name">[],
) {
  hospitals.forEach(({ id, name }) => {
    markers.get(id)?.button.setAttribute("aria-label", `${name} 선택`);
  });
}
