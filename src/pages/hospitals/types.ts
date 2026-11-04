// GET /api/hospitals 응답과 문진 완료 응답의 department 모양입니다.
// 실제 API 함수와 src/api의 타입은 #26에서 연결합니다. 이름은 #26(src/api/hospitals.ts)과 같게 두었습니다.

// 문진이 끝나면 오는 추천 진료과입니다.
export interface DepartmentRecommendation {
  // 심평원 진료과목코드입니다. 병원 검색의 departmentCode로 씁니다.
  departmentCode: string;
  departmentName: string;
  // AI가 만든 문장이라 면책 문장이 들어 있다는 보장이 없습니다. 면책은 화면에서 붙입니다.
  recommendReason: string;
}

export interface HospitalDepartment {
  departmentCode: string;
  departmentName: string;
}

// 오늘 진료 시간입니다.
export interface HospitalToday {
  // 진료 중이면 true입니다. 그 요일 진료 시간이 없으면 휴진(false)입니다.
  isOpen: boolean;
  // 응급실처럼 24시간 진료하면 true입니다.
  is24Hours: boolean;
  // HH:mm입니다.
  openTime: string | null;
  closeTime: string | null;
  // 진료 중이 아닐 때 다음 진료 시작 시각(ISO 8601 +09:00)입니다. 진료 중이면 null입니다.
  nextOpenAt: string | null;
}

export interface Hospital {
  hospitalId: number;
  name: string;
  // 심평원 종별코드입니다(31 의원, 21 병원, 11 종합병원 등).
  hospitalType: string;
  hospitalTypeName: string;
  departments: HospitalDepartment[];
  // 현재 위치(또는 지역 중심)에서의 거리 km이고 소수 1자리입니다.
  distanceKm: number;
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
  address: string;
  hasEmergencyRoom: boolean;
  // 진료 시간 정보가 아예 없으면 null입니다.
  today: HospitalToday | null;
}

export interface HospitalSearchResult {
  radiusKm: number;
  // 마지막 공공데이터 동기화 시각입니다("공공데이터 기준 · 갱신일").
  dataUpdatedAt: string;
  // 가까운 순입니다. 0건이면 []입니다.
  hospitals: Hospital[];
}

// 병원 검색 결과를 화면 분기로 나눈 것입니다(노션 GET /api/hospitals).
export type HospitalSearchOutcome =
  // HOSPITAL_200, 1곳 이상 → S05
  | { kind: "found"; result: HospitalSearchResult }
  // HOSPITAL_200, hospitals = [] → S05c
  | { kind: "empty"; result: HospitalSearchResult }
  // HOSPITAL_400, errors[0].field = "location"(위치와 지역이 모두 없음) → S05b
  | { kind: "needsRegion" }
  // HOSPITAL_500 → S05d
  | { kind: "error" };
