import { apiRequest, isMockApi } from "@/api/client";
import {
  ApiError,
  getFieldErrors,
  INVALID_RESPONSE,
  isApiError,
} from "@/api/errors";
import * as mock from "@/api/mockApi";
import type { DepartmentRecommendation } from "@/api/intakes";
import type { IsoDateTime, TimeOfDay } from "@/api/types";

export const HOSPITAL_RADIUS_DEFAULT_KM = 10;
export const HOSPITAL_LIMIT_DEFAULT = 3;
export const EMERGENCY_ROOM_RADIUS_DEFAULT_KM = 30;
export const EMERGENCY_ROOM_LIMIT_DEFAULT = 2;

// 병원이 가진 진료과입니다. 추천 이유는 문진 결과에만 있어서 보통 오지 않습니다.
export interface HospitalDepartment extends Pick<
  DepartmentRecommendation,
  "departmentCode" | "departmentName"
> {
  recommendReason?: string | null;
}

// 오늘 진료 시간입니다.
export interface HospitalToday {
  // 그 요일 진료 시간이 없으면 휴진(false)입니다.
  isOpen: boolean;
  // 응급실은 항상 true입니다(00:00~23:59).
  is24Hours: boolean;
  openTime: TimeOfDay | null;
  closeTime: TimeOfDay | null;
  // 휴진일 때 다음 진료 시작 시각입니다. 진료 중이면 null입니다.
  nextOpenAt: IsoDateTime | null;
}

export interface Hospital {
  hospitalId: number;
  name: string;
  // 심평원 종별코드입니다(01 상급종합, 11 종합병원, 21 병원, 31 의원, 71 보건소 등).
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

// 위치(latitude·longitude)와 regionCode 중 하나는 있어야 합니다.
// 둘 다 없으면 서버가 HOSPITAL_400(location)으로 응답하고, 결과는 needsRegion입니다.
export interface HospitalLocationParams {
  latitude?: number;
  longitude?: number;
  regionCode?: string;
}

export interface HospitalSearchParams extends HospitalLocationParams {
  // 비우면 진료과 조건 없이 찾습니다.
  departmentCode?: string;
  // 검색 반경 km입니다. 생략하면 10km입니다. 범위(1~30)는 서버가 판단하고, 벗어나면 HOSPITAL_400을 던집니다.
  radius?: number;
  // 가져올 병원 수입니다. 생략하면 3곳입니다. 범위(1~20)는 서버가 판단하고, 벗어나면 HOSPITAL_400을 던집니다.
  limit?: number;
}

export interface EmergencyRoomParams extends HospitalLocationParams {
  // 검색 반경 km입니다. 생략하면 30km입니다. 최대 50이고, 벗어나면 서버가 HOSPITAL_400을 던집니다.
  radius?: number;
  // 가져올 응급실 수입니다. 생략하면 2곳입니다. 최대 10이고, 벗어나면 서버가 HOSPITAL_400을 던집니다.
  limit?: number;
}

export interface HospitalSearchResult {
  radiusKm: number;
  // 마지막 공공데이터 동기화 시각입니다("공공데이터 기준 · 갱신일").
  dataUpdatedAt: IsoDateTime;
  // 반경 안 전체 병원 수입니다(limit과 무관).
  totalCount: number;
  // 가까운 순입니다. 0건이면 []입니다.
  hospitals: Hospital[];
}

export interface HealthCenterResult {
  dataUpdatedAt: IsoDateTime;
  // 반경 제한 없이 가장 가까운 보건소 1곳입니다. 없으면 null입니다.
  hospital: Hospital | null;
}

// 병원 검색 결과입니다. 호출한 쪽이 kind로 화면을 고릅니다.
export type HospitalSearchOutcome =
  // 병원이 1곳 이상 있습니다.
  | { kind: "found"; result: HospitalSearchResult }
  // 200이지만 0건입니다. 결과 없음 화면(S05c)입니다. result.radiusKm으로 반경을 넓혀 볼 수 있습니다.
  | { kind: "empty"; result: HospitalSearchResult }
  // 위치와 지역이 모두 없습니다(HOSPITAL_400, field = location). 지역 선택 화면(S05b)입니다.
  | { kind: "needsRegion"; error: ApiError }
  // 공공데이터 조회 실패(HOSPITAL_500)입니다. 오류 화면(S05d)입니다.
  | { kind: "error"; error: ApiError };

// 위치와 지역이 모두 없어 받은 오류인지 봅니다(HOSPITAL_400, field = location).
// errors가 비어 있을 수 있어 field로 찾습니다. 다른 field의 400은 여기에 해당하지 않습니다.
export function isLocationRequiredError(error: unknown): boolean {
  return (
    isApiError(error) &&
    error.code === "HOSPITAL_400" &&
    getFieldErrors(error).some((item) => item.field === "location")
  );
}

// 병원을 가까운 순으로 찾습니다.
// 위 네 가지 말고는 모두 ApiError를 그대로 던집니다(location이 아닌 HOSPITAL_400, HOSPITAL_429,
// 네트워크 오류, 형식이 맞지 않는 응답). 취소(abort) 오류도 그대로 던집니다.
export async function searchHospitals(
  params: HospitalSearchParams = {},
  signal?: AbortSignal,
): Promise<HospitalSearchOutcome> {
  const radius = params.radius ?? HOSPITAL_RADIUS_DEFAULT_KM;
  const limit = params.limit ?? HOSPITAL_LIMIT_DEFAULT;

  let result: HospitalSearchResult;
  try {
    if (isMockApi) {
      signal?.throwIfAborted();
      result = mock.searchHospitals(params, radius, limit);
    } else {
      result = await apiRequest<HospitalSearchResult>("/hospitals", {
        query: {
          departmentCode: params.departmentCode,
          latitude: params.latitude,
          longitude: params.longitude,
          regionCode: params.regionCode,
          radius,
          limit,
        },
        signal,
      });
    }
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.code === "HOSPITAL_500") return { kind: "error", error };
    if (isLocationRequiredError(error)) return { kind: "needsRegion", error };
    throw error;
  }

  if (!Array.isArray(result?.hospitals)) {
    throw new ApiError(INVALID_RESPONSE, "", 200);
  }
  return result.hospitals.length === 0
    ? { kind: "empty", result }
    : { kind: "found", result };
}

// 반경 제한 없이 가장 가까운 보건소 1곳을 찾습니다(S05c "가까운 보건소에 전화하기").
// 실패하면 ApiError를 던집니다. 보건소가 없으면 hospital이 null입니다.
export async function getNearestHealthCenter(
  params: HospitalLocationParams = {},
  signal?: AbortSignal,
): Promise<HealthCenterResult> {
  if (isMockApi) {
    signal?.throwIfAborted();
    return mock.getNearestHealthCenter(params);
  }
  return apiRequest<HealthCenterResult>("/hospitals/health-centers/nearest", {
    query: {
      latitude: params.latitude,
      longitude: params.longitude,
      regionCode: params.regionCode,
    },
    signal,
  });
}

// 가까운 응급실을 가까운 순으로 찾습니다. 0건이면 hospitals가 []입니다.
// 실패하면 ApiError를 던집니다. 위치와 지역이 모두 없는 경우는 isLocationRequiredError로 구분합니다.
export async function getEmergencyRooms(
  params: EmergencyRoomParams = {},
  signal?: AbortSignal,
): Promise<HospitalSearchResult> {
  const radius = params.radius ?? EMERGENCY_ROOM_RADIUS_DEFAULT_KM;
  const limit = params.limit ?? EMERGENCY_ROOM_LIMIT_DEFAULT;

  let result: HospitalSearchResult;
  if (isMockApi) {
    signal?.throwIfAborted();
    result = mock.getEmergencyRooms(params, radius, limit);
  } else {
    result = await apiRequest<HospitalSearchResult>(
      "/hospitals/emergency-rooms",
      {
        query: {
          latitude: params.latitude,
          longitude: params.longitude,
          regionCode: params.regionCode,
          radius,
          limit,
        },
        signal,
      },
    );
  }

  if (!Array.isArray(result?.hospitals)) {
    throw new ApiError(INVALID_RESPONSE, "", 200);
  }
  return result;
}
