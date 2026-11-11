export interface MapLocation {
  latitude: number;
  longitude: number;
}

export interface MapHospital extends MapLocation {
  id: string;
  name: string;
  // 목록 카드의 번호입니다. 좌표가 없어 지도에서 빠진 병원이 있어도 마커와 카드 번호가 같게 합니다.
  rank: number;
}

export interface HospitalMapProps {
  hospitals: readonly MapHospital[];
  selectedHospitalId?: string;
  userLocation?: MapLocation;
  onSelectHospital: (id: string) => void;
}
