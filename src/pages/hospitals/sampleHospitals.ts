import type { MapLocation } from "@/components/map/HospitalMap";
import { seoulDateString } from "@/pages/hospitals/hospitalSearch";
import type {
  DepartmentRecommendation,
  HospitalDepartment,
  HospitalSearchOutcome,
} from "@/pages/hospitals/types";

// 문진·병원 API(#26)를 연결하기 전 화면 검토용 가짜 데이터입니다. 노션 API 응답과 같은 모양이고,
// 병원 이름·전화번호·주소는 실제 정보가 아닌 값만 씁니다. 화면 구성은 Figma S05 예시를 따릅니다.

export const sampleDepartment: DepartmentRecommendation = {
  departmentCode: "05",
  departmentName: "정형외과",
  recommendReason: "무릎 통증이 사흘째이고 붓기가 있어 정형외과 진료를 권해요.",
};

// 병원 응답에는 사용자 위치가 없어서, 지도 중심으로 쓸 위치를 따로 둡니다.
export const sampleUserLocation: MapLocation = {
  latitude: 37.8813,
  longitude: 127.7298,
};

const orthopedics: HospitalDepartment[] = [
  { departmentCode: "05", departmentName: "정형외과" },
];

// "진료 종료 · 내일 09:00 시작" 예시가 날짜와 상관없이 보이도록 다음 날 09:00을 만듭니다.
function tomorrowAt(time: string, now: Date): string {
  const tomorrow = new Date(now.getTime() + 86_400_000);
  return `${seoulDateString(tomorrow)}T${time}:00+09:00`;
}

export function createSampleHospitalSearch(now: Date): HospitalSearchOutcome {
  return {
    kind: "found",
    result: {
      radiusKm: 10,
      dataUpdatedAt: "2026-10-12T04:00:00+09:00",
      hospitals: [
        {
          hospitalId: 101,
          name: "OO정형외과의원",
          hospitalType: "31",
          hospitalTypeName: "의원",
          departments: orthopedics,
          distanceKm: 1.2,
          latitude: 37.8875,
          longitude: 127.7362,
          phoneNumber: "000-0000-0001",
          address: "강원특별자치도 OO시 OO로 00",
          hasEmergencyRoom: false,
          today: {
            isOpen: true,
            is24Hours: false,
            openTime: "09:00",
            closeTime: "18:00",
            nextOpenAt: null,
          },
        },
        {
          hospitalId: 102,
          name: "△△병원 정형외과",
          hospitalType: "21",
          hospitalTypeName: "병원",
          departments: orthopedics,
          distanceKm: 2.4,
          latitude: 37.8902,
          longitude: 127.7151,
          phoneNumber: "000-0000-0002",
          address: "강원특별자치도 OO시 OO로 00",
          hasEmergencyRoom: false,
          today: {
            isOpen: true,
            is24Hours: false,
            openTime: "09:00",
            closeTime: "17:30",
            nextOpenAt: null,
          },
        },
        {
          hospitalId: 103,
          name: "XX의원",
          hospitalType: "31",
          hospitalTypeName: "의원",
          departments: orthopedics,
          distanceKm: 3.1,
          latitude: 37.8706,
          longitude: 127.7495,
          phoneNumber: "000-0000-0003",
          address: "강원특별자치도 OO시 OO로 00",
          hasEmergencyRoom: false,
          today: {
            isOpen: false,
            is24Hours: false,
            openTime: null,
            closeTime: null,
            nextOpenAt: tomorrowAt("09:00", now),
          },
        },
      ],
    },
  };
}
