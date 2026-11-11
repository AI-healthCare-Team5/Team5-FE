import { useState } from "react";
import { isMapPoint } from "@/components/map/cardAnchor";
import { KakaoHospitalMap } from "@/components/map/KakaoHospitalMap";
import { MapStatus } from "@/components/map/MapStatus";
import type { HospitalMapProps } from "@/components/map/types";

export type {
  HospitalMapProps,
  MapHospital,
  MapLocation,
} from "@/components/map/types";

// 병원 목록을 가진 화면(S05, E01)이 목록과 선택 상태를 props로 넘깁니다.
export function HospitalMap(allProps: HospitalMapProps) {
  // 좌표가 올바르지 않은 병원은 지도에서만 뺍니다. 목록 카드는 그대로 남습니다.
  const props = {
    ...allProps,
    hospitals: allProps.hospitals.filter(isMapPoint),
    userLocation:
      allProps.userLocation && isMapPoint(allProps.userLocation)
        ? allProps.userLocation
        : undefined,
  };
  const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
  const [loadFailed, setLoadFailed] = useState(false);
  const hasLocation =
    props.hospitals.length > 0 || props.userLocation !== undefined;
  if (!appKey || loadFailed || !hasLocation) {
    return <MapStatus />;
  }
  return (
    <KakaoHospitalMap
      {...props}
      appKey={appKey}
      onLoadError={() => setLoadFailed(true)}
    />
  );
}
