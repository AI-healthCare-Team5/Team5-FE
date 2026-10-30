import type { MapHospital, MapLocation } from "@/components/map/HospitalMap";

export interface Hospital extends MapHospital {
  department: string;
  // API 공통 규칙대로 km 숫자(소수 1자리)로 받고 화면에서 단위를 붙입니다.
  distanceKm: number;
  phone: string;
  open: boolean;
  hours: string;
}

export type HospitalSearch =
  | {
      status: "ok";
      department: string;
      reason: string;
      // ISO 8601(+09:00) 문자열입니다.
      dataUpdatedAt: string;
      userLocation: MapLocation;
      hospitals: Hospital[];
    }
  | { status: "error" };
