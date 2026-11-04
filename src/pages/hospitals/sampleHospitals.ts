import type { HospitalSearch } from "@/pages/hospitals/types";

// 병원 목록 API(#26)를 연결하기 전 화면 검토용 가짜 데이터입니다.
export const sampleHospitalSearch: HospitalSearch = {
  status: "ok",
  department: "정형외과",
  reason: "무릎 통증이 사흘째이고 붓기가 있어 정형외과 진료를 권해요.",
  dataUpdatedAt: "2026-10-12T09:00:00+09:00",
  userLocation: { latitude: 37.8813, longitude: 127.7298 },
  hospitals: [
    {
      id: "sample-1",
      name: "OO정형외과의원",
      department: "정형외과",
      distanceKm: 1.2,
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
      distanceKm: 2.4,
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
      distanceKm: 3.1,
      phone: "000-0000-0003",
      open: false,
      hours: "진료 종료 · 내일 09:00 시작",
      latitude: 37.8706,
      longitude: 127.7495,
    },
  ],
};
