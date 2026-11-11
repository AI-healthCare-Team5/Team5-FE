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
  // 카드를 누를 때마다 1씩 늘리는 값입니다. 이미 선택된 병원의 카드를 다시 눌러도
  // 지도가 그 마커로 돌아오게 합니다. 선택 ID가 같아 effect가 다시 실행되지 않는 경우를 위한 별도 요청입니다.
  panRequest?: number;
  userLocation?: MapLocation;
  onSelectHospital: (id: string) => void;
}
