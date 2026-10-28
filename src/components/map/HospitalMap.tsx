import { useState } from "react";
import { HospitalMapPreview } from "@/components/map/HospitalMapPreview";
import { KakaoHospitalMap } from "@/components/map/KakaoHospitalMap";
import type { HospitalMapProps } from "@/components/map/types";

export type {
  HospitalMapProps,
  MapHospital,
  MapLocation,
} from "@/components/map/types";

// 병원 목록을 가진 화면(S05)이 목록과 선택 상태를 props로 넘깁니다.
export function HospitalMap(props: HospitalMapProps) {
  const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
  const [loadFailed, setLoadFailed] = useState(false);
  const hasLocation =
    props.hospitals.length > 0 || props.userLocation !== undefined;
  if (!appKey || loadFailed || !hasLocation) {
    return <HospitalMapPreview {...props} />;
  }
  return (
    <KakaoHospitalMap
      {...props}
      appKey={appKey}
      onLoadError={() => setLoadFailed(true)}
    />
  );
}
