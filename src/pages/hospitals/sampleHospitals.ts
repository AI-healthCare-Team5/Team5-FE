import type { MapHospital, MapLocation } from "@/components/map/HospitalMap";

export interface Hospital extends MapHospital {
  department: string;
  distance: string;
  phone: string;
  open: boolean;
  hours: string;
}

export type HospitalSearch =
  | {
      status: "ok";
      department: string;
      reason: string;
      updatedAt: string;
      userLocation: MapLocation;
      hospitals: Hospital[];
    }
  | { status: "error" };

// 병원 목록 API(#26)를 연결하기 전 화면 검토용 가짜 데이터입니다.
export const sampleHospitalSearch: HospitalSearch = {
  status: "ok",
  department: "정형외과",
  reason:
    "무릎 통증이 사흘째이고 붓기가 있어 정형외과 진료를 권해요. 진단이 아니라 진료과 안내예요.",
  updatedAt: "2026.10.12",
  userLocation: { latitude: 37.8813, longitude: 127.7298 },
  hospitals: [
    {
      id: "sample-1",
      name: "OO정형외과의원",
      department: "정형외과",
      distance: "1.2km",
      phone: "000-0000-0001",
      open: true,
      hours: "오늘 18:00까지 진료",
      latitude: 37.8875,
      longitude: 127.7362,
    },
    {
      id: "sample-2",
      name: "△△병원 정형외과",
      department: "정형외과",
      distance: "2.4km",
      phone: "000-0000-0002",
      open: true,
      hours: "오늘 17:30까지 진료",
      latitude: 37.8902,
      longitude: 127.7151,
    },
    {
      id: "sample-3",
      name: "XX의원",
      department: "정형외과",
      distance: "3.1km",
      phone: "000-0000-0003",
      open: false,
      hours: "진료 종료 · 내일 09:00 시작",
      latitude: 37.8706,
      longitude: 127.7495,
    },
  ],
};
