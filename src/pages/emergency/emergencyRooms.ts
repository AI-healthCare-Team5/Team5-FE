import { isApiError } from "@/api/errors";
import {
  getEmergencyRooms,
  type Hospital,
  type HospitalSearchResult,
} from "@/api/hospitals";
import { getGeolocationPermission } from "@/components/map/currentPosition";
import type { MapLocation } from "@/components/map/types";
import { appActions, getAppState } from "@/stores/appStore";

// 응급실 카드의 "4.8km · 24시간" 줄입니다.
// 응답의 today.is24Hours가 true일 때만 24시간이라고 적고, 그 외에는 거리만 적습니다.
export function formatEmergencyRoomMeta(
  room: Pick<Hospital, "distanceKm" | "today">,
): string {
  const distance = `${room.distanceKm.toFixed(1)}km`;
  return room.today?.is24Hours ? `${distance} · 24시간` : distance;
}

// E01에 들어왔을 때 권한 창 없이 쓸 수 있는 위치를 정합니다.
// 이미 받은 위치를 다시 쓰고, 없으면 권한이 이미 허용된 경우에만 조용히 받습니다.
// 묻기 전(prompt)·거부·Permissions API 없음·조회 실패면 묻지 않고 null이며, 화면은 "가까운 응급실 찾기" 버튼으로 묻습니다.
// 권한 창이 119 버튼을 가리지 않게 하려는 것입니다.
export async function locateWithoutPrompt(): Promise<MapLocation | null> {
  const saved = getAppState().currentLocation;
  if (saved) return saved;
  if ((await getGeolocationPermission()) !== "granted") return null;
  return appActions.requestCurrentLocation();
}

// E01에 보여 줄 가까운 응급실을 가까운 순으로 찾습니다(기본 30km·2곳).
// 갱신일 안내에 쓰도록 응답(dataUpdatedAt 포함)을 그대로 돌려줍니다. 0건이면 hospitals가 []입니다.
// API 오류(HOSPITAL_400·500, 네트워크, 형식 오류)면 null이고, 화면은 119 안내만 남깁니다.
// 취소와 개발자 실수는 그대로 던집니다.
export async function findEmergencyRooms(
  location: MapLocation,
  signal?: AbortSignal,
): Promise<HospitalSearchResult | null> {
  try {
    return await getEmergencyRooms(
      { latitude: location.latitude, longitude: location.longitude },
      signal,
    );
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
}
